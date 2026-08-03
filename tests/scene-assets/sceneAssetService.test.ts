import { describe, expect, it } from "vitest";
import { SceneAssetService } from "../../lib/scene-assets/sceneAssetService";
import { SceneAssetDomainEvent, SceneAsset } from "../../lib/scene-assets/types";
import { AttachAssetInput, SceneAssetRepository } from "../../lib/scene-assets/repository";
import { SceneAssetAlreadyLinkedError, SceneAssetTargetNotFoundError } from "../../lib/scene-assets/errors";
import { AssetService } from "../../lib/assets/assetService";
import { Asset } from "../../lib/assets/types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "../../lib/assets/repository";
import { StorageAdapter } from "../../lib/storage/storageAdapter";
import { DownloadResult, StorageMetadata, StorageProvider, UploadResult } from "../../lib/storage/types";
import { StorageFileNotFoundError } from "../../lib/storage/storageErrors";

/** Repositório falso em memória do Asset Binding Engine. */
class FakeSceneAssetRepository implements SceneAssetRepository {
  private readonly rows = new Map<string, SceneAsset>();
  private counter = 0;

  async attach(input: AttachAssetInput): Promise<SceneAsset> {
    const duplicate = [...this.rows.values()].find(
      (r) => r.sceneId === input.sceneId && r.assetId === input.assetId && r.role === input.role
    );
    if (duplicate) {
      throw new SceneAssetAlreadyLinkedError(input.sceneId, input.assetId, input.role);
    }
    this.counter += 1;
    const now = new Date();
    const row: SceneAsset = {
      id: `scene-asset-${this.counter}`,
      sceneId: input.sceneId,
      assetId: input.assetId,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async detach(id: string): Promise<void> {
    this.rows.delete(id);
  }

  async findById(id: string): Promise<SceneAsset | undefined> {
    return this.rows.get(id);
  }

  async listBySceneId(sceneId: string): Promise<SceneAsset[]> {
    return [...this.rows.values()]
      .filter((r) => r.sceneId === sceneId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateRole(id: string, role: SceneAsset["role"]): Promise<SceneAsset | undefined> {
    const existing = this.rows.get(id);
    if (!existing) return undefined;
    const conflict = [...this.rows.values()].find(
      (r) => r.id !== id && r.sceneId === existing.sceneId && r.assetId === existing.assetId && r.role === role
    );
    if (conflict) {
      throw new SceneAssetAlreadyLinkedError(existing.sceneId, existing.assetId, role);
    }
    const updated = { ...existing, role, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
}

/** Fakes mínimos do Asset Manager (Repository + Storage), reaproveitando o AssetService real por cima. */
class FakeAssetRepository implements AssetRepository {
  private readonly assets = new Map<string, Asset>();
  private counter = 0;

  async createAsset(input: CreateAssetInput): Promise<Asset> {
    this.counter += 1;
    const now = new Date();
    const asset: Asset = {
      id: `asset-${this.counter}`,
      projectId: input.projectId,
      type: input.type,
      name: input.name,
      originalName: input.originalName,
      mimeType: input.mimeType,
      extension: input.extension,
      size: input.size,
      hash: null,
      storageKey: null,
      storageProvider: null,
      status: "READY",
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  async findAsset(assetId: string): Promise<Asset | undefined> {
    return this.assets.get(assetId);
  }

  async listAssets(projectId: string): Promise<Asset[]> {
    return [...this.assets.values()].filter((a) => a.projectId === projectId);
  }

  async updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset | undefined> {
    const existing = this.assets.get(assetId);
    if (!existing) return undefined;
    const updated = { ...existing, ...input, updatedAt: new Date() };
    this.assets.set(assetId, updated);
    return updated;
  }

  async deleteAsset(assetId: string): Promise<void> {
    const existing = this.assets.get(assetId);
    if (existing) this.assets.set(assetId, { ...existing, status: "DELETED" });
  }
}

class FakeStorageAdapter implements StorageAdapter {
  readonly provider: StorageProvider = "LOCAL";
  async upload(): Promise<UploadResult> {
    throw new Error("não deveria ser chamado nestes testes");
  }
  async download(): Promise<DownloadResult> {
    throw new Error("não deveria ser chamado nestes testes");
  }
  async delete(): Promise<void> {
    throw new Error("não deveria ser chamado nestes testes");
  }
  async exists(): Promise<boolean> {
    return false;
  }
  getPublicUrl(key: string): string {
    return `fake://${key}`;
  }
  async getSignedDownloadUrl(key: string): Promise<string> {
    throw new StorageFileNotFoundError(key);
  }
}

function buildAssetService(): AssetService {
  return new AssetService(new FakeAssetRepository(), new FakeStorageAdapter());
}

function buildScene() {
  const assetService = buildAssetService();
  const sceneAssetRepository = new FakeSceneAssetRepository();
  const service = new SceneAssetService(sceneAssetRepository, assetService);
  return { service, assetService, sceneAssetRepository };
}

function createInput(overrides: Partial<CreateAssetInput> = {}): CreateAssetInput {
  return {
    projectId: "projeto-1",
    type: "image",
    name: "referencia.png",
    originalName: "referencia.png",
    mimeType: "image/png",
    extension: "png",
    size: 1024,
    ...overrides,
  };
}

describe("SceneAssetService — attachAsset", () => {
  it("vincula um Asset existente e emite ASSET_ATTACHED com o resumo do Asset", async () => {
    const { service, assetService } = buildScene();
    const asset = await assetService.createAsset(createInput());
    const events: SceneAssetDomainEvent[] = [];
    service.subscribe((e) => events.push(e));

    const linked = await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    expect(linked.sceneId).toBe("1");
    expect(linked.assetId).toBe(asset.id);
    expect(linked.role).toBe("REFERENCE_IMAGE");
    expect(linked.asset.name).toBe("referencia.png");
    expect(linked.asset.type).toBe("image");

    expect(events).toEqual([
      { type: "ASSET_ATTACHED", sceneAssetId: linked.id, sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" },
    ]);
  });

  it("lança SceneAssetTargetNotFoundError para um Asset inexistente", async () => {
    const { service } = buildScene();
    await expect(
      service.attachAsset({ sceneId: "1", assetId: "asset-fantasma", role: "REFERENCE_IMAGE" })
    ).rejects.toThrow(SceneAssetTargetNotFoundError);
  });

  it("lança SceneAssetAlreadyLinkedError ao vincular o mesmo Asset com o mesmo papel duas vezes", async () => {
    const { service, assetService } = buildScene();
    const asset = await assetService.createAsset(createInput());
    await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    await expect(service.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" })).rejects.toThrow(
      SceneAssetAlreadyLinkedError
    );
  });

  it("permite vincular o mesmo Asset com um papel diferente", async () => {
    const { service, assetService } = buildScene();
    const asset = await assetService.createAsset(createInput());
    await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    const second = await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "CONCEPT_ART" });
    expect(second.role).toBe("CONCEPT_ART");
  });
});

describe("SceneAssetService — detachAsset", () => {
  it("remove um vínculo existente, emite ASSET_DETACHED e retorna true", async () => {
    const { service, assetService } = buildScene();
    const asset = await assetService.createAsset(createInput());
    const linked = await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "MUSIC" });

    const events: SceneAssetDomainEvent[] = [];
    service.subscribe((e) => events.push(e));

    const result = await service.detachAsset(linked.id);

    expect(result).toBe(true);
    expect(await service.listSceneAssets("1")).toHaveLength(0);
    expect(events).toEqual([
      { type: "ASSET_DETACHED", sceneAssetId: linked.id, sceneId: "1", assetId: asset.id },
    ]);
  });

  it("retorna false e não emite evento para um vínculo inexistente", async () => {
    const { service } = buildScene();
    const events: SceneAssetDomainEvent[] = [];
    service.subscribe((e) => events.push(e));

    const result = await service.detachAsset("scene-asset-fantasma");

    expect(result).toBe(false);
    expect(events).toHaveLength(0);
  });
});

describe("SceneAssetService — listSceneAssets", () => {
  it("lista, em ordem de criação, os Assets vinculados a uma cena — só dessa cena", async () => {
    const { service, assetService } = buildScene();
    const a1 = await assetService.createAsset(createInput({ name: "a.png" }));
    const a2 = await assetService.createAsset(createInput({ name: "b.png" }));

    await service.attachAsset({ sceneId: "1", assetId: a1.id, role: "REFERENCE_IMAGE" });
    await service.attachAsset({ sceneId: "1", assetId: a2.id, role: "MUSIC" });
    await service.attachAsset({ sceneId: "2", assetId: a1.id, role: "REFERENCE_IMAGE" });

    const sceneOne = await service.listSceneAssets("1");
    expect(sceneOne).toHaveLength(2);
    expect(sceneOne.map((s) => s.asset.name)).toEqual(["a.png", "b.png"]);

    const sceneTwo = await service.listSceneAssets("2");
    expect(sceneTwo).toHaveLength(1);
  });

  it("retorna lista vazia para uma cena sem vínculos", async () => {
    const { service } = buildScene();
    expect(await service.listSceneAssets("cena-sem-assets")).toEqual([]);
  });
});

describe("SceneAssetService — updateRole", () => {
  it("atualiza o papel e emite ASSET_ROLE_UPDATED", async () => {
    const { service, assetService } = buildScene();
    const asset = await assetService.createAsset(createInput());
    const linked = await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    const events: SceneAssetDomainEvent[] = [];
    service.subscribe((e) => events.push(e));

    const updated = await service.updateRole(linked.id, "CONCEPT_ART");

    expect(updated?.role).toBe("CONCEPT_ART");
    expect(events).toEqual([
      { type: "ASSET_ROLE_UPDATED", sceneAssetId: linked.id, sceneId: "1", assetId: asset.id, role: "CONCEPT_ART" },
    ]);
  });

  it("retorna undefined para um vínculo inexistente", async () => {
    const { service } = buildScene();
    expect(await service.updateRole("scene-asset-fantasma", "MUSIC")).toBeUndefined();
  });
});

describe("SceneAssetService — subscribe", () => {
  it("permite cancelar a inscrição", async () => {
    const { service, assetService } = buildScene();
    const asset = await assetService.createAsset(createInput());
    const events: SceneAssetDomainEvent[] = [];
    const unsubscribe = service.subscribe((e) => events.push(e));

    unsubscribe();
    await service.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    expect(events).toHaveLength(0);
  });
});
