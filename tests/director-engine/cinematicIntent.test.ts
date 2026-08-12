import { describe, expect, it } from "vitest";
import { createCinematicIntent } from "../../lib/director-engine/cinematicIntent";
import { DirectorContext } from "../../lib/director-context/types";

/**
 * Testes de `createCinematicIntent` (Task "Director Engine — Cinematic
 * Intent"). Cobre exatamente o que a Task pede: preservação de dados
 * reais, ausência de valores inventados, serialização, determinismo e
 * não-mutação — nada de "inteligência" (o Director Engine ainda não
 * decide nada; isso é assunto de uma Task futura).
 */

function buildFullContext(overrides: Partial<DirectorContext> = {}): DirectorContext {
  return {
    scene: {
      sceneId: "1",
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
    assets: [],
    generatedAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

function buildMinimalContext(): DirectorContext {
  return {
    scene: { sceneId: "cena-sem-identidade-resolvida" },
    assets: [],
    generatedAt: "2026-01-01T12:00:00.000Z",
  };
}

describe("createCinematicIntent — contexto completo", () => {
  it("cria um CinematicIntent a partir de um DirectorContext completo", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.sceneId).toBe("1");
  });

  it("preserva narrativeObjective, exatamente o texto original de Scene.narr (via creativeBrief.narrativeGoal)", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.narrativeObjective).toBe("Estabelecer o luto e a fadiga do narrador");
  });

  it("preserva emotionalObjective, exatamente o texto original de Scene.emo (via creativeBrief.emotionalGoal)", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.emotionalObjective).toBe("Solidão contemplativa");
  });

  it("preserva os dados visuais existentes (lighting, camera, palette) sem interpretá-los", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.visualIntent).toEqual({
      lighting: "Luz de vela, sombras longas",
      camera: "Plano fixo, leve zoom-in",
      palette: ["#0B0D10", "#3a2a12", "#1a1420"],
    });
  });

  it("preserva o áudio existente (sound), sem inventar trilha/efeitos/mixagem", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.audioIntent).toEqual({ sound: "Vento fraco, relógio ao longe" });
  });

  it("preserva a duração quando existente, sem inventar segundos estruturados ou BPM", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.pacingIntent).toEqual({ duration: "45s" });
  });

  it("preserva as constraints (approvalCriteria) já existentes na Scene", () => {
    const intent = createCinematicIntent(buildFullContext());

    expect(intent.constraints).toEqual({ approvalCriteria: "Silêncio deve ser sentido antes de qualquer corte" });
  });
});

describe("createCinematicIntent — contexto sem campos opcionais", () => {
  it("com um DirectorContext mínimo (só sceneId), todos os campos opcionais ficam ausentes — nenhum valor inventado", () => {
    const intent = createCinematicIntent(buildMinimalContext());

    expect(intent).toEqual({ sceneId: "cena-sem-identidade-resolvida" });
    expect(intent.narrativeObjective).toBeUndefined();
    expect(intent.emotionalObjective).toBeUndefined();
    expect(intent.visualIntent).toBeUndefined();
    expect(intent.audioIntent).toBeUndefined();
    expect(intent.pacingIntent).toBeUndefined();
    expect(intent.constraints).toBeUndefined();
  });

  it("pacingIntent é preenchido mesmo sem creativeBrief, se scene.duration existir (duration não depende de creativeBrief)", () => {
    const context: DirectorContext = {
      scene: { sceneId: "1", duration: "60s" },
      assets: [],
      generatedAt: "2026-01-01T12:00:00.000Z",
    };

    const intent = createCinematicIntent(context);

    expect(intent.pacingIntent).toEqual({ duration: "60s" });
    expect(intent.visualIntent).toBeUndefined();
    expect(intent.narrativeObjective).toBeUndefined();
  });
});

describe("createCinematicIntent — testes negativos (nenhum valor inventado)", () => {
  it("emotionalObjective ausente não vira 'emotional' nem nenhum outro default", () => {
    const context = buildFullContext({
      creativeBrief: { ...buildFullContext().creativeBrief, emotionalGoal: undefined },
    });

    const intent = createCinematicIntent(context);

    expect(intent.emotionalObjective).toBeUndefined();
    expect(JSON.stringify(intent)).not.toContain("emotional");
  });

  it("camera ausente não vira uma câmera automática dentro de visualIntent", () => {
    const context = buildFullContext({
      creativeBrief: { ...buildFullContext().creativeBrief, camera: undefined },
    });

    const intent = createCinematicIntent(context);

    expect(intent.visualIntent?.camera).toBeUndefined();
    expect(intent.visualIntent).toEqual({
      lighting: "Luz de vela, sombras longas",
      camera: undefined,
      palette: ["#0B0D10", "#3a2a12", "#1a1420"],
    });
  });

  it("lighting ausente não vira iluminação inventada dentro de visualIntent", () => {
    const context = buildFullContext({
      creativeBrief: { ...buildFullContext().creativeBrief, lighting: undefined },
    });

    const intent = createCinematicIntent(context);

    expect(intent.visualIntent?.lighting).toBeUndefined();
  });

  it("sound ausente não vira áudio inventado — audioIntent.sound continua undefined", () => {
    const context = buildFullContext({
      creativeBrief: { ...buildFullContext().creativeBrief, sound: undefined },
    });

    const intent = createCinematicIntent(context);

    expect(intent.audioIntent).toEqual({ sound: undefined });
  });

  it("nenhum termo genérico inventado (cinematic/dramatic/epic/dynamic) aparece em nenhum campo de um contexto mínimo", () => {
    const intent = createCinematicIntent(buildMinimalContext());
    const serialized = JSON.stringify(intent).toLowerCase();

    for (const invented of ["cinematic", "dramatic", "epic", "dynamic"]) {
      expect(serialized).not.toContain(invented);
    }
  });
});

describe("createCinematicIntent — serialização, determinismo, não-mutação", () => {
  it("o resultado é seguro para JSON.stringify — round-trip produz uma estrutura equivalente", () => {
    const intent = createCinematicIntent(buildFullContext());

    const serialized = JSON.stringify(intent);
    const restored = JSON.parse(serialized);

    expect(restored).toEqual(intent);
  });

  it("round-trip também funciona para um contexto mínimo (campos ausentes continuam ausentes após o round-trip)", () => {
    const intent = createCinematicIntent(buildMinimalContext());

    const restored = JSON.parse(JSON.stringify(intent));

    expect(restored).toEqual(intent);
    expect(restored.visualIntent).toBeUndefined();
  });

  it("não contém Date, função, Map, Set ou instância de classe em nenhum campo", () => {
    const intent = createCinematicIntent(buildFullContext());

    function assertPlainJson(value: unknown): void {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return;
      }
      if (value === undefined) return;
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

    assertPlainJson(intent);
  });

  it("é determinístico — chamar duas vezes com o mesmo contexto produz um resultado equivalente", () => {
    const context = buildFullContext();

    const first = createCinematicIntent(context);
    const second = createCinematicIntent(context);

    expect(first).toEqual(second);
  });

  it("não modifica o DirectorContext recebido", () => {
    const context = buildFullContext();
    const snapshot = JSON.parse(JSON.stringify(context));

    createCinematicIntent(context);

    expect(context).toEqual(snapshot);
  });
});

describe("Integração — sceneContextReader real (container) -> DirectorContext real -> createCinematicIntent", () => {
  it("com um DirectorContext real (Scene mockada + Postgres real para os Assets), produz um CinematicIntent válido, serializável e fiel aos dados reais", async () => {
    const { sceneContextReader } = await import("../../lib/director-context/container");

    const context = await sceneContextReader.getDirectorContext("1");
    const intent = createCinematicIntent(context);

    expect(intent.sceneId).toBe("1");
    // Cena "1" em lib/data.ts é "Meia-noite tenebrosa" — valores reais, não inventados.
    expect(intent.narrativeObjective).toBe(context.creativeBrief?.narrativeGoal);
    expect(intent.emotionalObjective).toBe(context.creativeBrief?.emotionalGoal);
    expect(intent.visualIntent).toEqual({
      lighting: context.creativeBrief?.lighting,
      camera: context.creativeBrief?.camera,
      palette: context.creativeBrief?.palette,
    });
    expect(intent.pacingIntent).toEqual({ duration: context.scene.duration });
    expect(() => JSON.stringify(intent)).not.toThrow();
    // Só leitura — nenhum dado é criado.
  });

  it("para um sceneId sem Scene correspondente, produz um CinematicIntent só com sceneId — nenhum valor inventado para preencher a ausência", async () => {
    const { sceneContextReader } = await import("../../lib/director-context/container");

    const context = await sceneContextReader.getDirectorContext("cena-que-nao-existe-no-mock");
    const intent = createCinematicIntent(context);

    expect(intent).toEqual({ sceneId: "cena-que-nao-existe-no-mock" });
  });
});
