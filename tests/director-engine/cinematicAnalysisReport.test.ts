import { describe, expect, it } from "vitest";
import { createCinematicAnalysisReport } from "../../lib/director-engine/cinematicAnalysisReport";
import { CinematicDecision, CinematicDecisionEntry } from "../../lib/director-engine/cinematicDecision";

/**
 * Testes de `createCinematicAnalysisReport` (Task "Director Engine —
 * Relatório Cinematográfico Determinístico por Cena"). Regra única sob
 * teste: transformação puramente mecânica — `requirement` deriva só de
 * `status`, `value`/`source` são ecoados sem interpretação, nada é
 * inventado. Nenhum teste aqui verifica "inteligência" nenhuma.
 */

const ALL_AVAILABLE_DECISIONS: CinematicDecisionEntry[] = [
  { category: "NARRATIVE", status: "AVAILABLE", value: "Objetivo narrativo real", source: "narrativeObjective" },
  { category: "EMOTIONAL", status: "AVAILABLE", value: "Objetivo emocional real", source: "emotionalObjective" },
  { category: "CAMERA", status: "AVAILABLE", value: "close-up", source: "visualIntent.camera" },
  { category: "LIGHTING", status: "AVAILABLE", value: "luz de vela", source: "visualIntent.lighting" },
  { category: "PALETTE", status: "AVAILABLE", value: ["#000000"], source: "visualIntent.palette" },
  { category: "AUDIO", status: "AVAILABLE", value: "vento", source: "audioIntent.sound" },
  { category: "PACING", status: "AVAILABLE", value: "45s", source: "pacingIntent.duration" },
  { category: "CONSTRAINTS", status: "AVAILABLE", value: "critério real", source: "constraints.approvalCriteria" },
];

const ALL_UNAVAILABLE_DECISIONS: CinematicDecisionEntry[] = [
  { category: "NARRATIVE", status: "UNAVAILABLE" },
  { category: "EMOTIONAL", status: "UNAVAILABLE" },
  { category: "CAMERA", status: "UNAVAILABLE" },
  { category: "LIGHTING", status: "UNAVAILABLE" },
  { category: "PALETTE", status: "UNAVAILABLE" },
  { category: "AUDIO", status: "UNAVAILABLE" },
  { category: "PACING", status: "UNAVAILABLE" },
  { category: "CONSTRAINTS", status: "UNAVAILABLE" },
];

function buildDecision(decisions: CinematicDecisionEntry[], sceneId = "scene-01"): CinematicDecision {
  return { sceneId, decisions };
}

describe("createCinematicAnalysisReport — CinematicDecision completa (todas AVAILABLE)", () => {
  it("todas as 8 entradas têm requirement DEFINED, summary reflete 8/8 disponíveis", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    expect(report.sceneId).toBe("scene-01");
    expect(report.categories.every((c) => c.requirement === "DEFINED")).toBe(true);
    expect(report.summary.availableCategories).toEqual([
      "NARRATIVE", "EMOTIONAL", "CAMERA", "LIGHTING", "PALETTE", "AUDIO", "PACING", "CONSTRAINTS",
    ]);
    expect(report.summary.unavailableCategories).toEqual([]);
  });

  it("counts corretos: availableCount = 8, unavailableCount = 0, totalCategories = 8", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    expect(report.summary.availableCount).toBe(8);
    expect(report.summary.unavailableCount).toBe(0);
    expect(report.summary.totalCategories).toBe(8);
  });

  it("missingFields fica vazio", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    expect(report.missingFields).toEqual([]);
  });
});

describe("createCinematicAnalysisReport — CinematicDecision mínima (todas UNAVAILABLE)", () => {
  it("todas as 8 entradas têm requirement MISSING, summary reflete 0/8 disponíveis", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_UNAVAILABLE_DECISIONS));

    expect(report.categories.every((c) => c.requirement === "MISSING")).toBe(true);
    expect(report.summary.availableCategories).toEqual([]);
    expect(report.summary.unavailableCategories).toEqual([
      "NARRATIVE", "EMOTIONAL", "CAMERA", "LIGHTING", "PALETTE", "AUDIO", "PACING", "CONSTRAINTS",
    ]);
    expect(report.summary.availableCount).toBe(0);
    expect(report.summary.unavailableCount).toBe(8);
  });

  it("missingFields lista as 8 categorias, na mesma ordem", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_UNAVAILABLE_DECISIONS));

    expect(report.missingFields).toEqual([
      "NARRATIVE", "EMOTIONAL", "CAMERA", "LIGHTING", "PALETTE", "AUDIO", "PACING", "CONSTRAINTS",
    ]);
  });

  it("nenhuma entrada UNAVAILABLE tem value ou source inventado", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_UNAVAILABLE_DECISIONS));

    for (const entry of report.categories) {
      expect(entry.value).toBeUndefined();
      expect(entry.source).toBeUndefined();
    }
  });
});

describe("createCinematicAnalysisReport — decisão parcialmente preenchida", () => {
  it("classifica, conta e preenche summary/missingFields corretamente para uma mistura de AVAILABLE/UNAVAILABLE", () => {
    const mixed: CinematicDecisionEntry[] = [
      { category: "NARRATIVE", status: "AVAILABLE", value: "x", source: "narrativeObjective" },
      { category: "EMOTIONAL", status: "UNAVAILABLE" },
      { category: "CAMERA", status: "AVAILABLE", value: "close-up", source: "visualIntent.camera" },
      { category: "LIGHTING", status: "UNAVAILABLE" },
      { category: "PALETTE", status: "AVAILABLE", value: ["#000"], source: "visualIntent.palette" },
      { category: "AUDIO", status: "UNAVAILABLE" },
      { category: "PACING", status: "AVAILABLE", value: "45s", source: "pacingIntent.duration" },
      { category: "CONSTRAINTS", status: "UNAVAILABLE" },
    ];

    const report = createCinematicAnalysisReport(buildDecision(mixed));

    expect(report.summary.availableCategories).toEqual(["NARRATIVE", "CAMERA", "PALETTE", "PACING"]);
    expect(report.summary.unavailableCategories).toEqual(["EMOTIONAL", "LIGHTING", "AUDIO", "CONSTRAINTS"]);
    expect(report.summary.availableCount).toBe(4);
    expect(report.summary.unavailableCount).toBe(4);
    expect(report.missingFields).toEqual(["EMOTIONAL", "LIGHTING", "AUDIO", "CONSTRAINTS"]);
  });

  it("totalCategories é derivado dinamicamente do tamanho real de decisions, não hardcoded", () => {
    const short: CinematicDecisionEntry[] = [
      { category: "NARRATIVE", status: "AVAILABLE", value: "x", source: "narrativeObjective" },
      { category: "CAMERA", status: "UNAVAILABLE" },
    ];

    const report = createCinematicAnalysisReport(buildDecision(short));

    expect(report.summary.totalCategories).toBe(2);
    expect(report.categories).toHaveLength(2);
  });
});

describe("createCinematicAnalysisReport — ordem determinística", () => {
  it("preserva a ordem das categorias em categories exatamente como aparecem em CinematicDecision.decisions", () => {
    const reordered: CinematicDecisionEntry[] = [
      { category: "PACING", status: "AVAILABLE", value: "45s", source: "pacingIntent.duration" },
      { category: "CAMERA", status: "UNAVAILABLE" },
      { category: "NARRATIVE", status: "AVAILABLE", value: "x", source: "narrativeObjective" },
    ];

    const report = createCinematicAnalysisReport(buildDecision(reordered));

    expect(report.categories.map((c) => c.category)).toEqual(["PACING", "CAMERA", "NARRATIVE"]);
    expect(report.summary.availableCategories).toEqual(["PACING", "NARRATIVE"]);
    expect(report.summary.unavailableCategories).toEqual(["CAMERA"]);
  });
});

describe("createCinematicAnalysisReport — value/source preservados exatamente, sem interpretação", () => {
  it("value e source são ecoados sem transformação para categorias AVAILABLE", () => {
    const decision = buildDecision(ALL_AVAILABLE_DECISIONS);

    const report = createCinematicAnalysisReport(decision);

    const byCategory = Object.fromEntries(report.categories.map((c) => [c.category, c]));
    expect(byCategory.CAMERA.value).toBe("close-up");
    expect(byCategory.CAMERA.source).toBe("visualIntent.camera");
    expect(byCategory.PALETTE.value).toEqual(["#000000"]);
  });

  it("o conteúdo textual de value nunca altera a classificação/requirement — só status importa", () => {
    const withScaryText: CinematicDecisionEntry[] = [
      { category: "EMOTIONAL", status: "AVAILABLE", value: "medo profundo, terror absoluto", source: "emotionalObjective" },
      { category: "CAMERA", status: "AVAILABLE", value: "", source: "visualIntent.camera" }, // string vazia, mas AVAILABLE
    ];

    const report = createCinematicAnalysisReport(buildDecision(withScaryText));

    expect(report.summary.availableCategories).toEqual(["EMOTIONAL", "CAMERA"]);
    expect(report.categories.every((c) => c.requirement === "DEFINED")).toBe(true);
  });

  it("uma categoria desconhecida (fora das 8 conhecidas) não é descartada nem corrigida — classificada mecanicamente pelo status, como as demais", () => {
    const withUnknownCategory = [
      { category: "WEATHER", status: "AVAILABLE", value: "chuva", source: "weather" },
      { category: "NARRATIVE", status: "UNAVAILABLE" },
    ] as unknown as CinematicDecisionEntry[];

    const report = createCinematicAnalysisReport(buildDecision(withUnknownCategory));

    expect(report.summary.availableCategories).toEqual(["WEATHER"]);
    expect(report.summary.unavailableCategories).toEqual(["NARRATIVE"]);
    expect(report.missingFields).toEqual(["NARRATIVE"]);
    expect(report.categories).toEqual([
      { category: "WEATHER", status: "AVAILABLE", value: "chuva", source: "weather", requirement: "DEFINED" },
      { category: "NARRATIVE", status: "UNAVAILABLE", requirement: "MISSING" },
    ]);
  });
});

describe("createCinematicAnalysisReport — Decision vazia", () => {
  it("uma CinematicDecision com decisions vazio produz um relatório válido, estruturalmente vazio", () => {
    const report = createCinematicAnalysisReport(buildDecision([]));

    expect(report.sceneId).toBe("scene-01");
    expect(report.categories).toEqual([]);
    expect(report.missingFields).toEqual([]);
    expect(report.summary).toEqual({
      availableCategories: [],
      unavailableCategories: [],
      totalCategories: 0,
      availableCount: 0,
      unavailableCount: 0,
    });
  });
});

describe("createCinematicAnalysisReport — nenhum campo cinematográfico inventado", () => {
  it("cada entrada de categories só tem as chaves do contrato (category/status/value/source/requirement)", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    for (const entry of report.categories) {
      expect(Object.keys(entry).sort()).toEqual(["category", "requirement", "source", "status", "value"].sort());
    }
  });

  it("o relatório só tem as chaves do contrato (sceneId/summary/categories/missingFields)", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    expect(Object.keys(report).sort()).toEqual(["categories", "missingFields", "sceneId", "summary"].sort());
    expect(Object.keys(report.summary).sort()).toEqual(
      ["availableCategories", "availableCount", "totalCategories", "unavailableCategories", "unavailableCount"].sort()
    );
  });

  it("nenhum termo cinematográfico inventado aparece na saída serializada", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));
    const serialized = JSON.stringify(report).toLowerCase();

    // Não busca "cinematic" — o próprio nome CinematicAnalysisReport/CinematicDecision
    // não deve gerar falso positivo; os termos abaixo não têm relação com esses nomes.
    for (const invented of [
      "dramatic", "epic", "dynamic", "beautiful", "immersive", "lens", "focallength", "aperture", "iso", "shutter",
      "cameraposition", "cameramovement", "lightintensity", "colortemperature", "bpm", "shottype", "visualstyle",
      "prompt", "ranking", "confidence", "score",
    ]) {
      expect(serialized).not.toContain(invented);
    }
  });
});

describe("createCinematicAnalysisReport — serialização, não-mutação, determinismo", () => {
  it("JSON.stringify funciona e faz round-trip fielmente", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    expect(() => JSON.stringify(report)).not.toThrow();
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it("não contém Date, função, classe ou referência circular", () => {
    const report = createCinematicAnalysisReport(buildDecision(ALL_AVAILABLE_DECISIONS));

    // `ancestors` rastreia só a cadeia atual (raiz -> nó atual), não todos os
    // nós já visitados — o mesmo array pode legitimamente aparecer em dois
    // ramos diferentes da árvore (ex.: `missingFields`/`summary.unavailableCategories`
    // compartilham a mesma referência, de propósito, para não duplicar cálculo).
    // Isso não é uma referência circular; só uma referência circular de verdade
    // (um nó que aparece dentro de si mesmo) deve falhar aqui.
    function assertPlainJson(value: unknown, ancestors: Set<unknown> = new Set()): void {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return;
      }
      if (typeof value === "function") {
        throw new Error("função encontrada");
      }
      expect(ancestors.has(value)).toBe(false); // detecta referência circular de verdade (ciclo na cadeia de ancestrais)
      if (typeof value === "object") {
        const nextAncestors = new Set(ancestors).add(value);
        if (Array.isArray(value)) {
          value.forEach((v) => assertPlainJson(v, nextAncestors));
          return;
        }
        expect(value.constructor === Object || value.constructor === undefined).toBe(true);
        Object.values(value as Record<string, unknown>).forEach((v) => assertPlainJson(v, nextAncestors));
      }
    }

    assertPlainJson(report);
  });

  it("é determinístico — mesma CinematicDecision produz sempre o mesmo relatório (sem nenhum campo temporal para ignorar)", () => {
    const decision = buildDecision(ALL_AVAILABLE_DECISIONS);

    const first = createCinematicAnalysisReport(decision);
    const second = createCinematicAnalysisReport(decision);

    expect(first).toEqual(second);
  });

  it("não modifica a CinematicDecision recebida", () => {
    const decision = buildDecision(ALL_AVAILABLE_DECISIONS);
    const snapshot = JSON.parse(JSON.stringify(decision));

    createCinematicAnalysisReport(decision);

    expect(decision).toEqual(snapshot);
  });
});
