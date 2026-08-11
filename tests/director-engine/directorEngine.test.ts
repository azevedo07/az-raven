import { describe, expect, it } from "vitest";
import { DirectorEngineImpl } from "../../lib/director-engine/directorEngine";
import { directorEngine } from "../../lib/director-engine/container";
import { DirectorContext } from "../../lib/director-context/types";
import { SceneContextReaderImpl } from "../../lib/director-context/sceneContextReaderImpl";
import { SceneAssetService } from "../../lib/scene-assets/sceneAssetService";
import { SceneAsset } from "../../lib/scene-assets/types";
import { AttachAssetInput, SceneAssetRepository, UpdateSceneAssetInput } from "../../lib/scene-assets/repository";
import { AssetService } from "../../lib/assets/assetService";
import { Asset } from "../../lib/assets/types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "../../lib/assets/repository";
import { StorageAdapter } from "../../lib/storage/storageAdapter";
import { DownloadResult, StorageProvider, UploadResult } from "../../lib/storage/types";
import { StorageFileNotFoundError } from "../../lib/storage/storageErrors";
import { Scene } from "../../lib/types";

/**
 * Testes do `DirectorEngineImpl` (Task "Director Engine Foundation,
 * parte 2"). A classe é deliberadamente burra — nenhum teste aqui
 * verifica "inteligência" nenhuma, só a fronteira: aceita um
 * `DirectorContext`, preserva `sceneId`, não modifica a entrada, produz
 * um resultado serializável e determinístico (exceto `generatedAt`).
 */

function buildContext(overrides: Partial<DirectorContext> = {}): DirectorContext {
  return {
    scene: { sceneId: "1", title: "Meia-noite tenebrosa", order: 1, status: "aprovado", duration: "45s" },
    creativeBrief: { emotionalGoal: "Solidão contemplativa" },
    assets: [],
    generatedAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

function buildAsset(overrides: Partial<DirectorContext["assets"][number]> = {}): DirectorContext["assets"][number] {
  return {
    sceneAssetId: "scene-asset-1",
    assetId: "asset-1",
    name: "referencia.png",
    type: "image",
    mimeType: "image/png",
    extension: "png",
    size: 1024,
    status: "READY",
    storageProvider: "LOCAL",
    role: "REFERENCE_IMAGE",
    order: 0,
    metadata: null,
    linkedAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("DirectorEngineImpl — process", () => {
  it("aceita um DirectorContext válido e retorna status PROCESSED", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildContext());

    expect(result.status).toBe("PROCESSED");
    expect(result.diagnostics).toEqual([]);
  });

  it("retorna o sceneId correto, ecoado de context.scene.sceneId", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildContext({ scene: { sceneId: "cena-42" } }));

    expect(result.sceneId).toBe("cena-42");
  });

  it("o resultado é serializável com JSON.stringify", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildContext({ assets: [buildAsset()] }));

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("não modifica o DirectorContext recebido", async () => {
    const engine = new DirectorEngineImpl();
    const context = buildContext({ assets: [buildAsset({ metadata: { nota: "closeup" } })] });
    const snapshot = JSON.parse(JSON.stringify(context));

    await engine.process(context);

    expect(context).toEqual(snapshot);
  });

  it("processar duas vezes o mesmo contexto produz resultado determinístico (exceto generatedAt)", async () => {
    const engine = new DirectorEngineImpl();
    const context = buildContext({ assets: [buildAsset()] });

    const first = await engine.process(context);
    const second = await engine.process(context);

    expect(first.status).toBe(second.status);
    expect(first.sceneId).toBe(second.sceneId);
    expect(first.diagnostics).toEqual(second.diagnostics);
    // generatedAt propositalmente não é comparado — é hora de processamento, não determinístico.
    expect(typeof first.generatedAt).toBe("string");
    expect(typeof second.generatedAt).toBe("string");
  });

  it("um contexto com Assets preserva role/order/metadata sem mutação e sem perda de dados", async () => {
    const engine = new DirectorEngineImpl();
    const assets = [
      buildAsset({ sceneAssetId: "sa-1", role: "CHARACTER", order: 0, metadata: { nota: "plano geral" } }),
      buildAsset({ sceneAssetId: "sa-2", role: "LOCATION", order: 1, metadata: null }),
    ];
    const context = buildContext({ assets });

    const result = await engine.process(context);

    expect(result.status).toBe("PROCESSED");
    expect(context.assets).toEqual(assets);
    expect(context.assets[0].role).toBe("CHARACTER");
    expect(context.assets[0].metadata).toEqual({ nota: "plano geral" });
    expect(context.assets[1].role).toBe("LOCATION");
  });

  it("um contexto sem Assets (array vazio) continua válido", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildContext({ assets: [] }));

    expect(result.status).toBe("PROCESSED");
  });

  it("um contexto sem creativeBrief (campo opcional ausente) continua válido", async () => {
    const engine = new DirectorEngineImpl();
    const context = buildContext();
    delete context.creativeBrief;

    const result = await engine.process(context);

    expect(result.status).toBe("PROCESSED");
  });

  it("trata explicitamente (sem lançar) um sceneId ausente/vazio, retornando INVALID_CONTEXT com diagnóstico", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildContext({ scene: { sceneId: "" } }));

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.diagnostics).toEqual([
      { code: "MISSING_SCENE_ID", message: 'DirectorContext.scene.sceneId é obrigatório e deve ser uma string não vazia.' },
    ]);
  });

  it("trata explicitamente (sem lançar) assets que não é um array", async () => {
    const engine = new DirectorEngineImpl();
    const context = { ...buildContext(), assets: "não é um array" } as unknown as DirectorContext;

    const result = await engine.process(context);

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.diagnostics.some((d) => d.code === "INVALID_ASSETS")).toBe(true);
  });

  it("trata explicitamente (sem lançar) um context completamente ausente", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(undefined as unknown as DirectorContext);

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.sceneId).toBe("");
    expect(result.diagnostics).toEqual([{ code: "MISSING_CONTEXT", message: "DirectorContext não foi informado." }]);
  });
});

describe("lib/director-engine/container.ts — Composition Root real", () => {
  it("directorEngine (a instância composta pelo container) processa um DirectorContext de verdade", async () => {
    const context = buildContext({ assets: [buildAsset()] });

    const result = await directorEngine.process(context);

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe(context.scene.sceneId);
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

/**
 * Integração em memória: Scene (fakes) -> SceneContextReaderImpl ->
 * DirectorContext -> DirectorEngineImpl.process(). Mesmos fakes de
 * `tests/director-context/sceneContextReaderImpl.test.ts` — prova a
 * fronteira ponta a ponta, sem Postgres, sem HTTP, sem UI.
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
    return [...this.rows.values()].filter((r) => r.sceneId === sceneId).sort((a, b) => a.order - b.order);
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

describe("Integração — Scene -> SceneContextReader -> DirectorContext -> DirectorEngine", () => {
  it("constrói um DirectorContext real a partir de fakes, processa com DirectorEngineImpl, e preserva sceneId/serialização/imutabilidade", async () => {
    const assetService = new AssetService(new FakeAssetRepository(), new FakeStorageAdapter());
    const sceneAssetService = new SceneAssetService(new FakeSceneAssetRepository(), assetService);
    const reader = new SceneContextReaderImpl(sceneAssetService, [buildScene()]);
    const engine = new DirectorEngineImpl();

    const asset = await assetService.createAsset({
      projectId: "o-corvo",
      type: "image",
      name: "referencia.png",
      originalName: "referencia.png",
      mimeType: "image/png",
      extension: "png",
      size: 1024,
    });
    await sceneAssetService.attachAsset({ sceneId: "1", assetId: asset.id, role: "REFERENCE_IMAGE" });

    const context = await reader.getDirectorContext("1");
    const contextSnapshot = JSON.parse(JSON.stringify(context));

    const result = await engine.process(context);

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("1");
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(context).toEqual(contextSnapshot);
  });
});
