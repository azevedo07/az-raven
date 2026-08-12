import { describe, expect, it } from "vitest";
import { CinematicDecision, CinematicDecisionEntry, createCinematicDecision } from "../../lib/director-engine/cinematicDecision";
import { CinematicIntent } from "../../lib/director-engine/cinematicIntent";

/**
 * Testes de `createCinematicDecision` (Task "Director Engine —
 * Primeira Camada de Decisão Cinematográfica Determinística"). Regra
 * única sob teste: "quando existe evidência explícita no
 * `CinematicIntent`, preserve-a tal como está; quando não existe,
 * declare ausência — nunca invente." Nenhum teste aqui verifica
 * "inteligência" nenhuma — a função não interpreta texto, não faz NLP,
 * não infere parâmetros técnicos.
 */

function buildFullIntent(overrides: Partial<CinematicIntent> = {}): CinematicIntent {
  return {
    sceneId: "scene-01",
    narrativeObjective: "Estabelecer o luto e a fadiga do narrador",
    emotionalObjective: "Solidão contemplativa",
    visualIntent: { lighting: "Luz de vela, sombras longas", camera: "Plano fixo, leve zoom-in", palette: ["#0B0D10", "#3a2a12"] },
    audioIntent: { sound: "Vento fraco, relógio ao longe" },
    pacingIntent: { duration: "45s" },
    constraints: { approvalCriteria: "Silêncio deve ser sentido antes de qualquer corte" },
    ...overrides,
  };
}

function findEntry(decision: CinematicDecision, category: CinematicDecisionEntry["category"]): CinematicDecisionEntry {
  const entry = decision.decisions.find((d) => d.category === category);
  if (!entry) throw new Error(`categoria ${category} não encontrada — createCinematicDecision deveria sempre incluir as 8 categorias`);
  return entry;
}

describe("createCinematicDecision — Intent completo", () => {
  it("produz uma decisão AVAILABLE, com valor e origem corretos, para cada uma das 8 categorias", () => {
    const decision = createCinematicDecision(buildFullIntent());

    expect(decision.sceneId).toBe("scene-01");
    expect(decision.decisions).toHaveLength(8);
    expect(decision.decisions.every((d) => d.status === "AVAILABLE")).toBe(true);
  });

  it("preserva narrativeObjective (categoria NARRATIVE), com o texto original intacto e a origem correta", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "NARRATIVE");

    expect(entry).toEqual({
      category: "NARRATIVE",
      status: "AVAILABLE",
      value: "Estabelecer o luto e a fadiga do narrador",
      source: "narrativeObjective",
    });
  });

  it("preserva emotionalObjective (categoria EMOTIONAL), com o texto original intacto e a origem correta", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "EMOTIONAL");

    expect(entry).toEqual({
      category: "EMOTIONAL",
      status: "AVAILABLE",
      value: "Solidão contemplativa",
      source: "emotionalObjective",
    });
  });

  it("preserva a câmera (categoria CAMERA) — reconhece que existe uma indicação, mas nunca decompõe em lente/posição/movimento", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "CAMERA");

    expect(entry).toEqual({
      category: "CAMERA",
      status: "AVAILABLE",
      value: "Plano fixo, leve zoom-in",
      source: "visualIntent.camera",
    });
    expect(entry).not.toHaveProperty("lens");
    expect(entry).not.toHaveProperty("movement");
    expect(entry).not.toHaveProperty("position");
  });

  it("preserva a iluminação (categoria LIGHTING) — reconhece que existe, mas nunca converte em parâmetro técnico (intensidade, temperatura de cor)", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "LIGHTING");

    expect(entry).toEqual({
      category: "LIGHTING",
      status: "AVAILABLE",
      value: "Luz de vela, sombras longas",
      source: "visualIntent.lighting",
    });
    expect(entry).not.toHaveProperty("intensity");
    expect(entry).not.toHaveProperty("colorTemperature");
  });

  it("preserva a paleta (categoria PALETTE) como a lista original, sem transformação", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "PALETTE");

    expect(entry).toEqual({
      category: "PALETTE",
      status: "AVAILABLE",
      value: ["#0B0D10", "#3a2a12"],
      source: "visualIntent.palette",
    });
  });

  it("preserva o áudio existente (categoria AUDIO), sem inventar trilha, efeitos ou mixagem", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "AUDIO");

    expect(entry).toEqual({
      category: "AUDIO",
      status: "AVAILABLE",
      value: "Vento fraco, relógio ao longe",
      source: "audioIntent.sound",
    });
  });

  it("preserva a duração quando existente (categoria PACING), sem inventar segundos estruturados ou BPM", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "PACING");

    expect(entry).toEqual({
      category: "PACING",
      status: "AVAILABLE",
      value: "45s",
      source: "pacingIntent.duration",
    });
    expect(entry).not.toHaveProperty("bpm");
    expect(entry).not.toHaveProperty("seconds");
  });

  it("preserva as constraints já existentes (categoria CONSTRAINTS)", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const entry = findEntry(decision, "CONSTRAINTS");

    expect(entry).toEqual({
      category: "CONSTRAINTS",
      status: "AVAILABLE",
      value: "Silêncio deve ser sentido antes de qualquer corte",
      source: "constraints.approvalCriteria",
    });
  });
});

describe("createCinematicDecision — Intent mínimo", () => {
  it("com um Intent só com sceneId, todas as 8 categorias ficam UNAVAILABLE — nenhum valor inventado", () => {
    const decision = createCinematicDecision({ sceneId: "scene-unknown" });

    expect(decision.sceneId).toBe("scene-unknown");
    expect(decision.decisions).toHaveLength(8);
    for (const entry of decision.decisions) {
      expect(entry.status).toBe("UNAVAILABLE");
      expect(entry).not.toHaveProperty("value");
      expect(entry).not.toHaveProperty("source");
    }
  });

  it("sceneId é preservado mesmo quando nenhum outro dado existe", () => {
    const decision = createCinematicDecision({ sceneId: "cena-x" });
    expect(decision.sceneId).toBe("cena-x");
  });
});

describe("createCinematicDecision — testes negativos (nenhuma invenção)", () => {
  it("campo ausente não gera decisão inventada — cada categoria ausente vira UNAVAILABLE, nunca um valor default", () => {
    const decision = createCinematicDecision({
      sceneId: "1",
      narrativeObjective: "Objetivo real",
      // emotionalObjective, visualIntent, audioIntent, pacingIntent, constraints — todos ausentes
    });

    expect(findEntry(decision, "NARRATIVE").status).toBe("AVAILABLE");
    expect(findEntry(decision, "EMOTIONAL").status).toBe("UNAVAILABLE");
    expect(findEntry(decision, "CAMERA").status).toBe("UNAVAILABLE");
    expect(findEntry(decision, "LIGHTING").status).toBe("UNAVAILABLE");
    expect(findEntry(decision, "PALETTE").status).toBe("UNAVAILABLE");
    expect(findEntry(decision, "AUDIO").status).toBe("UNAVAILABLE");
    expect(findEntry(decision, "PACING").status).toBe("UNAVAILABLE");
    expect(findEntry(decision, "CONSTRAINTS").status).toBe("UNAVAILABLE");
  });

  it("nenhuma string genérica (cinematic/dramatic/epic/dynamic/beautiful/immersive) aparece em nenhum campo, mesmo com Intent completo", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const serialized = JSON.stringify(decision).toLowerCase();

    for (const invented of ["cinematic", "dramatic", "epic", "dynamic", "beautiful", "immersive"]) {
      expect(serialized).not.toContain(invented);
    }
  });

  it("nenhum parâmetro cinematográfico inexistente é criado — estruturalmente, nenhuma entrada tem chaves além de category/status/value/source", () => {
    const decision = createCinematicDecision(buildFullIntent());

    const forbiddenKeys = ["lens", "focalLength", "cameraMovement", "lightingIntensity", "colorTemperature", "depthOfField", "bpm", "aperture"];
    for (const entry of decision.decisions) {
      const keys = Object.keys(entry);
      expect(keys.every((k) => ["category", "status", "value", "source"].includes(k))).toBe(true);
      for (const forbidden of forbiddenKeys) {
        expect(entry).not.toHaveProperty(forbidden);
      }
    }
  });

  it("texto livre não é interpretado — 'close-up' na câmera nunca vira lens/position/movement inventados", () => {
    const decision = createCinematicDecision(buildFullIntent({ visualIntent: { camera: "close-up" } }));
    const entry = findEntry(decision, "CAMERA");

    expect(entry.value).toBe("close-up");
    expect(JSON.stringify(entry).toLowerCase()).not.toContain("85mm");
    expect(JSON.stringify(entry).toLowerCase()).not.toContain("static");
  });

  it("um sceneId desconhecido (Scene não resolvida) não faz a função inventar nenhum dado cinematográfico para compensar", () => {
    const decision = createCinematicDecision({ sceneId: "scene-unknown" });
    const serialized = JSON.stringify(decision).toLowerCase();

    for (const invented of ["cinematic", "dramatic", "epic", "dynamic", "lens", "bpm"]) {
      expect(serialized).not.toContain(invented);
    }
  });
});

describe("createCinematicDecision — serialização, determinismo, não-mutação", () => {
  it("é seguro para JSON.stringify — round-trip produz uma estrutura equivalente", () => {
    const decision = createCinematicDecision(buildFullIntent());
    const roundTripped = JSON.parse(JSON.stringify(decision));
    expect(roundTripped).toEqual(decision);
  });

  it("round-trip também funciona para um Intent mínimo", () => {
    const decision = createCinematicDecision({ sceneId: "1" });
    const roundTripped = JSON.parse(JSON.stringify(decision));
    expect(roundTripped).toEqual(decision);
  });

  it("não contém Date em nenhum campo", () => {
    const decision = createCinematicDecision(buildFullIntent());
    expect(decision).not.toHaveProperty("createdAt");
    expect(decision).not.toHaveProperty("generatedAt");
    for (const entry of decision.decisions) {
      expect(Object.values(entry).some((v) => v instanceof Date)).toBe(false);
    }
  });

  it("não contém Function em nenhum campo", () => {
    const decision = createCinematicDecision(buildFullIntent());
    expect(typeof decision).not.toBe("function");
    for (const entry of decision.decisions) {
      expect(Object.values(entry).some((v) => typeof v === "function")).toBe(false);
    }
  });

  it("não contém instância de classe em nenhum campo — só objetos e arrays literais", () => {
    const decision = createCinematicDecision(buildFullIntent());
    expect(decision.constructor === Object || decision.constructor === undefined).toBe(true);
    for (const entry of decision.decisions) {
      expect(entry.constructor === Object || entry.constructor === undefined).toBe(true);
    }
  });

  it("é determinístico — chamar duas vezes com o mesmo intent produz um resultado equivalente", () => {
    const intent = buildFullIntent();
    const first = createCinematicDecision(intent);
    const second = createCinematicDecision(intent);
    expect(first).toEqual(second);
  });

  it("não modifica o CinematicIntent recebido", () => {
    const intent = buildFullIntent();
    const snapshot = JSON.parse(JSON.stringify(intent));

    createCinematicDecision(intent);

    expect(intent).toEqual(snapshot);
  });
});
