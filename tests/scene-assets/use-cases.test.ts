import { describe, expect, it } from "vitest";
import { SceneAssetService } from "../../lib/scene-assets/sceneAssetService";
import { SceneAsset } from "../../lib/scene-assets/types";
import { AttachAssetInput, SceneAssetRepository, UpdateSceneAssetInput } from "../../lib/scene-assets/repository";
import { SceneAssetAlreadyLinkedError } from "../../lib/scene-assets/errors";
import { AssetService } from "../../lib/assets/assetService";
import { Asset } from "../../lib/assets/types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "../../lib/assets/repository";
import { StorageAdapter } from "../../lib/storage/storageAdapter";
import { DownloadResult, StorageProvider, UploadResult } from "../../lib/storage/types";
import { AttachAssetToSceneUseCaseImpl } from "../../lib/scene-assets/use-cases/attachAssetToSceneUseCase";
import { DetachAssetFromSceneUseCaseImpl } from "../../lib/scene-assets/use-cases/detachAssetFromSceneUseCase";
import { ListSceneAssetsUseCaseImpl } from "../../lib/scene-assets/use-cases/listSceneAssetsUseCase";
import { UpdateSceneAssetUseCaseImpl } from "../../lib/scene-assets/use-cases/updateSceneAssetUseCase";

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
    const existingInScene = [...this.rows.values()].filter((r) => r.sceneId === input.sceneId);
    const row: SceneAsset = {
      id: `scene-asset-${this.counter}`,
      sceneId: input.sceneId,
      assetId: input.assetId,
      role: input.role,
      order: input.order ?? (existingInScene.length === 0 ? 0 : Math.max(...existingInScene.map((r) => r.order)) + 1),
      metadata: input.metadata ?? null,
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
      .sort((a, b) => a.order - b.order);
  }

  async update(id: string, input: UpdateSceneAssetInput): Promise<SceneAsset | undefined> {
    const existing = this.rows.get(id);
    if (!existing) return undefined;
    const updated: SceneAsset = {
      ...existing,
      role: input.role ?? existing.role,
      order: input.order ?? existing.order,
      metadata: input.metadata !== undefined ? input.metadata : existing.metadata,
      updatedAt: new Date(),
    };
    this.rows.set(id, updated);
    return updated;
  }
}

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
  async delete(): Promise<void> {}
  async exists(): Promise<boolean> {
    return false;
  }
  getPublicUrl(key: string): string {
    return `fake://${key}`;
  }
  async getSignedDownloadUrl(key: string): Promise<string> {
    return `fake://${key}`;
  }
}

function buildService(): { service: SceneAssetService; assetService: AssetService } {
  const assetService = new AssetService(new FakeAssetRepository(), new FakeStorageAdapter());
  return { service: new SceneAssetService(new FakeSceneAssetRepository(), assetService), assetService };
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

describe("AttachAssetToSceneUseCase", () => {
  it("vincula um Asset via SceneAssetService", async () => {
    const { service, assetService } = buildService();
    const asset = await assetService.createAsset(createInput());

    const linked = await new AttachAssetToSceneUseCaseImpl(service).execute({
      sceneId: "1",
      assetId: asset.id,
      role: "REFERENCE_IMAGE",
    });

    expect(linked.sceneId).toBe("1");
    expect(linked.asset.id).toBe(asset.id);
  });

  it("propaga SceneAssetAlreadyLinkedError", async () => {
    const { service, assetService } = buildService();
    const asset = await assetService.createAsset(createInput());
    const useCase = new AttachAssetToSceneUseCaseImpl(service);

    await useCase.execute({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    await expect(useCase.execute({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" })).rejects.toThrow(
      SceneAssetAlreadyLinkedError
    );
  });
});

describe("ListSceneAssetsUseCase", () => {
  it("lista os vínculos de uma cena", async () => {
    const { service, assetService } = buildService();
    const asset = await assetService.createAsset(createInput());
    await new AttachAssetToSceneUseCaseImpl(service).execute({ sceneId: "1", assetId: asset.id, role: "MUSIC" });

    const list = await new ListSceneAssetsUseCaseImpl(service).execute({ sceneId: "1" });

    expect(list).toHaveLength(1);
    expect(list[0].role).toBe("MUSIC");
  });
});

describe("UpdateSceneAssetUseCase", () => {
  it("atualiza o papel de um vínculo existente", async () => {
    const { service, assetService } = buildService();
    const asset = await assetService.createAsset(createInput());
    const linked = await new AttachAssetToSceneUseCaseImpl(service).execute({
      sceneId: "1",
      assetId: asset.id,
      role: "MUSIC",
    });

    const updated = await new UpdateSceneAssetUseCaseImpl(service).execute({
      sceneAssetId: linked.id,
      role: "SFX",
    });

    expect(updated?.role).toBe("SFX");
  });

  it("atualiza order e metadata sem exigir role", async () => {
    const { service, assetService } = buildService();
    const asset = await assetService.createAsset(createInput());
    const linked = await new AttachAssetToSceneUseCaseImpl(service).execute({
      sceneId: "1",
      assetId: asset.id,
      role: "MUSIC",
    });

    const updated = await new UpdateSceneAssetUseCaseImpl(service).execute({
      sceneAssetId: linked.id,
      order: 4,
      metadata: { nota: "trilha do clímax" },
    });

    expect(updated?.role).toBe("MUSIC");
    expect(updated?.order).toBe(4);
    expect(updated?.metadata).toEqual({ nota: "trilha do clímax" });
  });

  it("retorna undefined para um vínculo inexistente", async () => {
    const { service } = buildService();
    const result = await new UpdateSceneAssetUseCaseImpl(service).execute({
      sceneAssetId: "scene-asset-fantasma",
      role: "SFX",
    });
    expect(result).toBeUndefined();
  });
});

describe("DetachAssetFromSceneUseCase", () => {
  it("remove um vínculo existente e retorna true", async () => {
    const { service, assetService } = buildService();
    const asset = await assetService.createAsset(createInput());
    const linked = await new AttachAssetToSceneUseCaseImpl(service).execute({
      sceneId: "1",
      assetId: asset.id,
      role: "MUSIC",
    });

    const result = await new DetachAssetFromSceneUseCaseImpl(service).execute({ sceneAssetId: linked.id });

    expect(result).toBe(true);
    expect(await new ListSceneAssetsUseCaseImpl(service).execute({ sceneId: "1" })).toHaveLength(0);
  });

  it("retorna false para um vínculo inexistente", async () => {
    const { service } = buildService();
    const result = await new DetachAssetFromSceneUseCaseImpl(service).execute({
      sceneAssetId: "scene-asset-fantasma",
    });
    expect(result).toBe(false);
  });
});
