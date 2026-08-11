import { describe, expect, it } from "vitest";
import { DirectorContext, DirectorContextAsset } from "../../lib/director-context/types";

/**
 * Testes de contrato do `DirectorContext` (Task "Director Engine
 * Foundation") — não testam nenhum comportamento de Director Engine
 * (ele ainda não existe), só a forma do próprio contrato: pode ser
 * construído, é serializável, preserva role/order/metadata, e campos
 * opcionais podem estar ausentes.
 */

function buildAsset(overrides: Partial<DirectorContextAsset> = {}): DirectorContextAsset {
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

describe("DirectorContext — contrato", () => {
  it("um DirectorContext válido pode ser construído com todos os campos preenchidos", () => {
    const context: DirectorContext = {
      scene: {
        sceneId: "1",
        projectId: "o-corvo",
        title: "Meia-noite tenebrosa",
        order: 1,
        status: "aprovado",
        duration: "45s",
      },
      creativeBrief: {
        emotionalGoal: "Solidão contemplativa",
        narrativeGoal: "Estabelecer o luto e a fadiga do narrador",
        lighting: "Luz de vela, sombras longas",
        camera: "Plano fixo, leve zoom-in",
        sound: "Vento fraco, relógio ao longe",
        palette: ["#0B0D10", "#3a2a12", "#1a1420"],
        approvalCriteria: "Silêncio deve ser sentido antes de qualquer corte",
      },
      assets: [buildAsset()],
      generatedAt: "2026-01-01T12:00:00.000Z",
    };

    expect(context.scene.sceneId).toBe("1");
    expect(context.assets).toHaveLength(1);
  });

  it("scene é o único campo obrigatório — creativeBrief e os campos de identidade além de sceneId podem estar ausentes", () => {
    const context: DirectorContext = {
      scene: { sceneId: "cena-sem-identidade-resolvida" },
      assets: [],
      generatedAt: "2026-01-01T12:00:00.000Z",
    };

    expect(context.scene.sceneId).toBe("cena-sem-identidade-resolvida");
    expect(context.scene.title).toBeUndefined();
    expect(context.creativeBrief).toBeUndefined();
    expect(context.assets).toEqual([]);
  });

  it("preserva role, order e metadata de cada Asset associado", () => {
    const context: DirectorContext = {
      scene: { sceneId: "1" },
      assets: [
        buildAsset({ sceneAssetId: "sa-1", role: "CHARACTER", order: 0, metadata: { nota: "closeup" } }),
        buildAsset({ sceneAssetId: "sa-2", role: "LOCATION", order: 1, metadata: null }),
      ],
      generatedAt: "2026-01-01T12:00:00.000Z",
    };

    expect(context.assets[0].role).toBe("CHARACTER");
    expect(context.assets[0].order).toBe(0);
    expect(context.assets[0].metadata).toEqual({ nota: "closeup" });
    expect(context.assets[1].role).toBe("LOCATION");
    expect(context.assets[1].order).toBe(1);
    expect(context.assets[1].metadata).toBeNull();
  });

  it("é seguro para JSON.stringify — round-trip preserva todos os campos", () => {
    const context: DirectorContext = {
      scene: { sceneId: "1", projectId: "o-corvo", title: "Meia-noite tenebrosa", order: 1, status: "aprovado", duration: "45s" },
      creativeBrief: { emotionalGoal: "Solidão contemplativa", palette: ["#0B0D10", "#3a2a12"] },
      assets: [buildAsset({ metadata: { nota: "closeup", pesos: [1, 2, 3] } })],
      generatedAt: "2026-01-01T12:00:00.000Z",
    };

    const roundTripped = JSON.parse(JSON.stringify(context));
    expect(roundTripped).toEqual(context);
  });

  it("não contém nenhum objeto que não seja serializável (sem Date, sem BigInt, sem funções) em nenhum campo", () => {
    const context: DirectorContext = {
      scene: { sceneId: "1" },
      assets: [buildAsset()],
      generatedAt: new Date().toISOString(),
    };

    function assertPlainJson(value: unknown): void {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(assertPlainJson);
        return;
      }
      if (typeof value === "object") {
        expect(value?.constructor === Object || value?.constructor === undefined).toBe(true);
        Object.values(value as Record<string, unknown>).forEach(assertPlainJson);
        return;
      }
      throw new Error(`Valor não serializável encontrado: ${typeof value}`);
    }

    assertPlainJson(context);
  });
});
