import { describe, expect, it } from "vitest";
import { DirectorEngineImpl } from "../../lib/director-engine/directorEngine";
import { directorEngine } from "../../lib/director-engine/container";
import { CinematicDecision, createCinematicDecision } from "../../lib/director-engine/cinematicDecision";
import { CinematicIntent, createCinematicIntent } from "../../lib/director-engine/cinematicIntent";
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
 * parte 2"; contrato migrado de `DirectorContext` para `CinematicIntent`
 * na Task "Director Engine — Integrar CinematicIntent ao processamento";
 * migrado de `CinematicIntent` para `CinematicDecision` na Task
 * "Director Engine — Primeira Camada de Decisão Cinematográfica
 * Determinística"). A classe é deliberadamente burra — nenhum teste
 * aqui verifica "inteligência" nenhuma, só a fronteira: aceita um
 * `CinematicDecision` já pronto, preserva `sceneId`, ecoa a decisão no
 * resultado, não modifica a entrada, produz um resultado serializável e
 * determinístico (exceto `generatedAt`).
 */

function buildIntent(overrides: Partial<CinematicIntent> = {}): CinematicIntent {
  return {
    sceneId: "1",
    narrativeObjective: "Estabelecer o luto e a fadiga do narrador",
    emotionalObjective: "Solidão contemplativa",
    visualIntent: { lighting: "Luz de vela, sombras longas", camera: "Plano fixo, leve zoom-in", palette: ["#0B0D10"] },
    audioIntent: { sound: "Vento fraco, relógio ao longe" },
    pacingIntent: { duration: "45s" },
    constraints: { approvalCriteria: "Silêncio deve ser sentido antes de qualquer corte" },
    ...overrides,
  };
}

/** Constrói a decisão a partir de um Intent real (nunca à mão) — garante que a fixture sempre reflete o contrato de verdade. */
function buildDecision(intentOverrides: Partial<CinematicIntent> = {}): CinematicDecision {
  return createCinematicDecision(buildIntent(intentOverrides));
}

describe("DirectorEngineImpl — process", () => {
  it("aceita um CinematicDecision válido e retorna status PROCESSED", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision());

    expect(result.status).toBe("PROCESSED");
    expect(result.diagnostics).toEqual([]);
  });

  it("usa o sceneId da Decision, ecoado em result.sceneId", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision({ sceneId: "cena-42" }));

    expect(result.sceneId).toBe("cena-42");
  });

  it("ecoa a CinematicDecision recebida em result.decision, sem transformação", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();

    const result = await engine.process(decision);

    expect(result.decision).toEqual(decision);
  });

  it("o resultado é serializável com JSON.stringify", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision());

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("não modifica a CinematicDecision recebida", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();
    const snapshot = JSON.parse(JSON.stringify(decision));

    await engine.process(decision);

    expect(decision).toEqual(snapshot);
  });

  it("é determinístico — processar duas vezes a mesma decision produz resultado equivalente (exceto generatedAt)", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();

    const first = await engine.process(decision);
    const second = await engine.process(decision);

    expect(first.status).toBe(second.status);
    expect(first.sceneId).toBe(second.sceneId);
    expect(first.decision).toEqual(second.decision);
    expect(first.diagnostics).toEqual(second.diagnostics);
    // generatedAt propositalmente não é comparado — é hora de processamento, não determinístico.
    expect(typeof first.generatedAt).toBe("string");
    expect(typeof second.generatedAt).toBe("string");
  });

  it("uma Decision derivada de um Intent mínimo (só sceneId) continua válida — todas as 8 categorias UNAVAILABLE, nenhuma inventada", async () => {
    const engine = new DirectorEngineImpl();
    const decision = createCinematicDecision({ sceneId: "1" });

    const result = await engine.process(decision);

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("1");
    expect(result.decision?.decisions.every((d) => d.status === "UNAVAILABLE")).toBe(true);
    expect(result.decision?.decisions.every((d) => d.value === undefined && d.source === undefined)).toBe(true);
  });

  it("uma Decision mínima não gera nenhum valor cinematográfico inventado no resultado (busca textual por termos genéricos)", async () => {
    const engine = new DirectorEngineImpl();
    const decision = createCinematicDecision({ sceneId: "1" });

    const result = await engine.process(decision);
    const serialized = JSON.stringify(result).toLowerCase();

    for (const invented of ["cinematic", "dramatic", "epic", "dynamic", "beautiful", "immersive", "lens", "focallength", "aperture", "cameraposition", "cameramovement", "lightintensity", "colortemperature", "depthoffield", "bpm", "transition", "prompt", "recommendation", "score", "ranking", "confidence"]) {
      expect(serialized).not.toContain(invented);
    }
  });

  it("produz um CinematicAnalysisReport em result.analysisReport, com sceneId preservado", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision({ sceneId: "cena-77" });

    const result = await engine.process(decision);

    expect(result.analysisReport).toBeDefined();
    expect(result.analysisReport?.sceneId).toBe("cena-77");
  });

  it("uma Decision totalmente preenchida produz analysisReport com summary de 8/8 DEFINED", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();

    const result = await engine.process(decision);

    expect(result.analysisReport?.summary.availableCount).toBe(8);
    expect(result.analysisReport?.summary.unavailableCount).toBe(0);
    expect(result.analysisReport?.summary.totalCategories).toBe(8);
    expect(result.analysisReport?.missingFields).toEqual([]);
    expect(result.analysisReport?.categories.every((c) => c.requirement === "DEFINED")).toBe(true);
  });

  it("uma Decision mínima (Intent só com sceneId) produz analysisReport com todas as categorias MISSING", async () => {
    const engine = new DirectorEngineImpl();
    const decision = createCinematicDecision({ sceneId: "1" });

    const result = await engine.process(decision);

    expect(result.analysisReport?.summary.availableCount).toBe(0);
    expect(result.analysisReport?.summary.unavailableCount).toBe(8);
    expect(result.analysisReport?.categories.every((c) => c.requirement === "MISSING")).toBe(true);
    expect(result.analysisReport?.missingFields).toEqual([
      "NARRATIVE", "EMOTIONAL", "CAMERA", "LIGHTING", "PALETTE", "AUDIO", "PACING", "CONSTRAINTS",
    ]);
  });

  it("uma Decision parcial produz analysisReport com classificação, summary e missingFields corretos", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision({ visualIntent: undefined, audioIntent: undefined });

    const result = await engine.process(decision);

    expect(result.analysisReport?.summary.availableCategories).toEqual(["NARRATIVE", "EMOTIONAL", "PACING", "CONSTRAINTS"]);
    expect(result.analysisReport?.summary.unavailableCategories).toEqual(["CAMERA", "LIGHTING", "PALETTE", "AUDIO"]);
    expect(result.analysisReport?.missingFields).toEqual(["CAMERA", "LIGHTING", "PALETTE", "AUDIO"]);
    expect(result.analysisReport?.summary).toEqual({
      availableCategories: ["NARRATIVE", "EMOTIONAL", "PACING", "CONSTRAINTS"],
      unavailableCategories: ["CAMERA", "LIGHTING", "PALETTE", "AUDIO"],
      totalCategories: 8,
      availableCount: 4,
      unavailableCount: 4,
    });
  });

  it("o analysisReport preserva a mesma ordem de categorias que a CinematicDecision original", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();

    const result = await engine.process(decision);

    expect(result.analysisReport?.categories.map((c) => c.category)).toEqual(decision.decisions.map((d) => d.category));
  });

  it("o analysisReport ecoa value/source exatamente como estão na Decision, para cada categoria disponível", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();

    const result = await engine.process(decision);

    const byCategory = Object.fromEntries((result.analysisReport?.categories ?? []).map((c) => [c.category, c]));
    expect(byCategory.CAMERA).toEqual({
      category: "CAMERA",
      status: "AVAILABLE",
      value: "Plano fixo, leve zoom-in",
      source: "visualIntent.camera",
      requirement: "DEFINED",
    });
  });

  it("o analysisReport não interpreta o conteúdo de value — só o status importa para a classificação e o requirement", async () => {
    const engine = new DirectorEngineImpl();
    const withScaryCamera = buildDecision({ visualIntent: { camera: "câmera trêmula e aterrorizante, close extremo" } });

    const result = await engine.process(withScaryCamera);

    expect(result.analysisReport?.summary.availableCategories).toContain("CAMERA");
    const serialized = JSON.stringify(result.analysisReport).toLowerCase();
    expect(serialized).toContain("trêmula"); // value é ecoado, não removido — só não influencia a classificação
    expect(serialized).not.toContain("close-up"); // nada é inferido a partir do texto original
  });

  it("o analysisReport não cria nenhum parâmetro técnico ou recomendação — só as chaves do contrato", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision());

    expect(Object.keys(result.analysisReport ?? {}).sort()).toEqual(["categories", "missingFields", "sceneId", "summary"].sort());
    expect(Object.keys(result.analysisReport?.summary ?? {}).sort()).toEqual(
      ["availableCategories", "availableCount", "totalCategories", "unavailableCategories", "unavailableCount"].sort()
    );
    for (const entry of result.analysisReport?.categories ?? []) {
      expect(Object.keys(entry).sort()).toEqual(["category", "requirement", "source", "status", "value"].sort());
    }
  });

  it("o analysisReport é determinístico — mesma decision produz o mesmo analysisReport em duas chamadas", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();

    const first = await engine.process(decision);
    const second = await engine.process(decision);

    expect(first.analysisReport).toEqual(second.analysisReport);
  });

  it("processar não modifica a CinematicDecision original, mesmo produzindo o analysisReport", async () => {
    const engine = new DirectorEngineImpl();
    const decision = buildDecision();
    const snapshot = JSON.parse(JSON.stringify(decision));

    await engine.process(decision);

    expect(decision).toEqual(snapshot);
  });

  it("o resultado com analysisReport continua serializável com JSON.stringify", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision());

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("um CinematicDecision inválido (INVALID_CONTEXT) não produz analysisReport", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision({ sceneId: "" }));

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.analysisReport).toBeUndefined();
  });

  it("trata explicitamente (sem lançar) um sceneId ausente/vazio, retornando INVALID_CONTEXT com diagnóstico", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(buildDecision({ sceneId: "" }));

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.decision).toBeUndefined();
    expect(result.diagnostics).toEqual([
      { code: "MISSING_SCENE_ID", message: "CinematicDecision.sceneId é obrigatório e deve ser uma string não vazia." },
    ]);
  });

  it("trata explicitamente (sem lançar) decisions que não é um array", async () => {
    const engine = new DirectorEngineImpl();
    const malformed = { ...buildDecision(), decisions: "não é um array" } as unknown as CinematicDecision;

    const result = await engine.process(malformed);

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.diagnostics.some((d) => d.code === "INVALID_DECISIONS")).toBe(true);
  });

  it("trata explicitamente (sem lançar) uma decision completamente ausente", async () => {
    const engine = new DirectorEngineImpl();

    const result = await engine.process(undefined as unknown as CinematicDecision);

    expect(result.status).toBe("INVALID_CONTEXT");
    expect(result.sceneId).toBe("");
    expect(result.diagnostics).toEqual([{ code: "MISSING_DECISION", message: "CinematicDecision não foi informado." }]);
  });

  it("não acessa infraestrutura — DirectorEngineImpl não recebe nenhuma dependência no construtor", () => {
    expect(() => new DirectorEngineImpl()).not.toThrow();
  });
});

describe("lib/director-engine/container.ts — Composition Root real", () => {
  it("directorEngine (a instância composta pelo container) processa um CinematicDecision de verdade", async () => {
    const decision = buildDecision();

    const result = await directorEngine.process(decision);

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe(decision.sceneId);
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

/**
 * Integração em memória: Scene (fakes) -> SceneContextReaderImpl ->
 * DirectorContext -> createCinematicIntent -> CinematicIntent ->
 * createCinematicDecision -> CinematicDecision ->
 * DirectorEngineImpl.process(). Mesmos fakes de
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

describe("Integração — Scene -> SceneContextReader -> DirectorContext -> createCinematicIntent -> CinematicIntent -> createCinematicDecision -> CinematicDecision -> DirectorEngine", () => {
  it("constrói um DirectorContext real a partir de fakes, transforma em CinematicIntent e depois CinematicDecision (funções reais, sem mock), processa com DirectorEngineImpl, e preserva sceneId/serialização/imutabilidade em cada etapa", async () => {
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

    const intent = createCinematicIntent(context);
    const intentSnapshot = JSON.parse(JSON.stringify(intent));

    const decision = createCinematicDecision(intent);
    // A decisão preserva os dados reais da Scene, categoria por categoria — nada inventado.
    expect(decision).toEqual({
      sceneId: "1",
      decisions: [
        { category: "NARRATIVE", status: "AVAILABLE", value: "Estabelecer o luto e a fadiga do narrador", source: "narrativeObjective" },
        { category: "EMOTIONAL", status: "AVAILABLE", value: "Solidão contemplativa", source: "emotionalObjective" },
        { category: "CAMERA", status: "AVAILABLE", value: "Plano fixo, leve zoom-in", source: "visualIntent.camera" },
        { category: "LIGHTING", status: "AVAILABLE", value: "Luz de vela, sombras longas", source: "visualIntent.lighting" },
        { category: "PALETTE", status: "AVAILABLE", value: ["#0B0D10", "#3a2a12", "#1a1420"], source: "visualIntent.palette" },
        { category: "AUDIO", status: "AVAILABLE", value: "Vento fraco, relógio ao longe", source: "audioIntent.sound" },
        { category: "PACING", status: "AVAILABLE", value: "45s", source: "pacingIntent.duration" },
        { category: "CONSTRAINTS", status: "AVAILABLE", value: "Silêncio deve ser sentido antes de qualquer corte", source: "constraints.approvalCriteria" },
      ],
    });
    expect(context).toEqual(contextSnapshot); // createCinematicIntent não modificou o context.
    expect(intent).toEqual(intentSnapshot); // createCinematicDecision não modificou o intent.

    const result = await engine.process(decision);

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("1");
    expect(result.decision).toEqual(decision);
    expect(result.analysisReport?.sceneId).toBe("1");
    expect(result.analysisReport?.summary).toEqual({
      availableCategories: ["NARRATIVE", "EMOTIONAL", "CAMERA", "LIGHTING", "PALETTE", "AUDIO", "PACING", "CONSTRAINTS"],
      unavailableCategories: [],
      totalCategories: 8,
      availableCount: 8,
      unavailableCount: 0,
    });
    expect(result.analysisReport?.missingFields).toEqual([]);
    expect(result.analysisReport?.categories).toEqual(
      decision.decisions.map((d) => ({ ...d, requirement: "DEFINED" }))
    );
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
