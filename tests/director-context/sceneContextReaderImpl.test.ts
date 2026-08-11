import { describe, expect, it } from "vitest";
import { SceneContextReaderImpl } from "../../lib/director-context/sceneContextReaderImpl";
import { SceneAssetService } from "../../lib/scene-assets/sceneAssetService";
import { SceneAsset } from "../../lib/scene-assets/types";
import { AttachAssetInput, SceneAssetRepository, UpdateSceneAssetInput } from "../../lib/scene-assets/repository";
import { SceneAssetAlreadyLinkedError } from "../../lib/scene-assets/errors";
import { AssetService } from "../../lib/assets/assetService";
import { Asset } from "../../lib/assets/types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "../../lib/assets/repository";
import { StorageAdapter } from "../../lib/storage/storageAdapter";
import { DownloadResult, StorageProvider, UploadResult } from "../../lib/storage/types";
import { StorageFileNotFoundError } from "../../lib/storage/storageErrors";
import { Scene } from "../../lib/types";

/**
 * Testes de `SceneContextReaderImpl` (Task "Director Engine Foundation")
 * — contra fakes em memória, mesmo princípio de
 * `tests/scene-assets/sceneAssetService.test.ts`: reaproveita o
 * `SceneAssetService` real por cima de um `SceneAssetRepository` falso,
 * para não duplicar a lógica de negócio já testada lá. Nenhum Postgres
 * necessário — `SceneContextReaderImpl` recebe `scenes` via construtor,
 * não importa `lib/data.ts` diretamente.
 */

class FakeSceneAssetRepository implements SceneAssetRepository {
  private readonly rows = new Map<string, SceneAsset>();
  private counter = 0;

  async attach(input: AttachAssetInput): Promise<SceneAsset> {
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
    throw new StorageFileNotFoundError(key);
  }
}

function buildScene(overrides: Partial<Scene> = {}): Scene {
  return {
    n: 1,
    title: "Meia-noite tenebrosa",
    emo: "Solidão contemplativa",
    narr: "Estabelecer o luto e a fadiga do narrador",
    tempo: "00:00–00:45",
    duracao: "45s",
    som: "Vento fraco, relógio ao longe",
    luz: "Luz de vela, sombras longas",
    cam: "Plano fixo, leve zoom-in",
    paleta: ["#0B0D10", "#3a2a12", "#1a1420"],
    status: "aprovado",
    criterio: "Silêncio deve ser sentido antes de qualquer corte",
    ...overrides,
  };
}

function buildAssetInput(overrides: Partial<CreateAssetInput> = {}): CreateAssetInput {
  return {
    projectId: "o-corvo",
    type: "image",
    name: "referencia.png",
    originalName: "referencia.png",
    mimeType: "image/png",
    extension: "png",
    size: 1024,
    ...overrides,
  };
}

function buildReader(scenes: Scene[] = [buildScene()]) {
  const assetService = new AssetService(new FakeAssetRepository(), new FakeStorageAdapter());
  const sceneAssetService = new SceneAssetService(new FakeSceneAssetRepository(), assetService);
  const reader = new SceneContextReaderImpl(sceneAssetService, scenes);
  return { reader, sceneAssetService, assetService };
}

describe("SceneContextReaderImpl — getDirectorContext", () => {
  it("monta a identidade da Scene e o creativeBrief a partir de uma Scene conhecida, sem Assets vinculados", async () => {
    const { reader } = buildReader([buildScene()]);

    const context = await reader.getDirectorContext("1");

    expect(context.scene).toEqual({
      sceneId: "1",
      title: "Meia-noite tenebrosa",
      order: 1,
      status: "aprovado",
      duration: "45s",
    });
    expect(context.creativeBrief).toEqual({
      emotionalGoal: "Solidão contemplativa",
      narrativeGoal: "Estabelecer o luto e a fadiga do narrador",
      lighting: "Luz de vela, sombras longas",
      camera: "Plano fixo, leve zoom-in",
      sound: "Vento fraco, relógio ao longe",
      palette: ["#0B0D10", "#3a2a12", "#1a1420"],
      approvalCriteria: "Silêncio deve ser sentido antes de qualquer corte",
    });
    expect(context.assets).toEqual([]);
    expect(context.scene.projectId).toBeUndefined();
  });

  it("para um sceneId sem Scene correspondente, devolve só sceneId — creativeBrief ausente, assets ainda populado", async () => {
    const { reader, assetService, sceneAssetService } = buildReader([]);
    const asset = await assetService.createAsset(buildAssetInput());
    await sceneAssetService.attachAsset({ sceneId: "cena-fantasma", assetId: asset.id, role: "REFERENCE_IMAGE" });

    const context = await reader.getDirectorContext("cena-fantasma");

    expect(context.scene).toEqual({ sceneId: "cena-fantasma" });
    expect(context.creativeBrief).toBeUndefined();
    expect(context.assets).toHaveLength(1);
  });

  it("preserva role, order e metadata de cada Asset vinculado, na ordem devolvida pelo SceneAssetService", async () => {
    const { reader, assetService, sceneAssetService } = buildReader([buildScene()]);
    const a1 = await assetService.createAsset(buildAssetInput({ name: "b.png" }));
    const a2 = await assetService.createAsset(buildAssetInput({ name: "a.png" }));

    await sceneAssetService.attachAsset({ sceneId: "1", assetId: a1.id, role: "REFERENCE_IMAGE", order: 5, metadata: { nota: "plano geral" } });
    await sceneAssetService.attachAsset({ sceneId: "1", assetId: a2.id, role: "CHARACTER", order: 1 });

    const context = await reader.getDirectorContext("1");

    expect(context.assets.map((a) => a.name)).toEqual(["a.png", "b.png"]);
    expect(context.assets[0]).toMatchObject({ role: "CHARACTER", order: 1, metadata: null });
    expect(context.assets[1]).toMatchObject({ role: "REFERENCE_IMAGE", order: 5, metadata: { nota: "plano geral" } });
  });

  it("converte createdAt/updatedAt do vínculo para ISO 8601 (string), nunca Date", async () => {
    const { reader, assetService, sceneAssetService } = buildReader([buildScene()]);
    const asset = await assetService.createAsset(buildAssetInput());
    await sceneAssetService.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    const context = await reader.getDirectorContext("1");

    expect(typeof context.assets[0].linkedAt).toBe("string");
    expect(typeof context.assets[0].updatedAt).toBe("string");
    expect(() => new Date(context.assets[0].linkedAt).toISOString()).not.toThrow();
  });

  it("generatedAt é uma string ISO 8601 gerada no momento da leitura", async () => {
    const { reader } = buildReader([buildScene()]);
    const before = Date.now();

    const context = await reader.getDirectorContext("1");

    expect(typeof context.generatedAt).toBe("string");
    expect(new Date(context.generatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("o resultado inteiro é seguro para JSON.stringify", async () => {
    const { reader, assetService, sceneAssetService } = buildReader([buildScene()]);
    const asset = await assetService.createAsset(buildAssetInput());
    await sceneAssetService.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE", metadata: { nota: "teste" } });

    const context = await reader.getDirectorContext("1");

    expect(() => JSON.stringify(context)).not.toThrow();
    expect(JSON.parse(JSON.stringify(context))).toEqual(context);
  });
});
