import { describe, expect, it, vi } from "vitest";
import { ProcessSceneWithDirectorUseCaseImpl } from "../../lib/director-engine/use-cases/processSceneWithDirectorUseCase";
import { SceneContextReader } from "../../lib/director-context/sceneContextReader";
import { DirectorContext } from "../../lib/director-context/types";
import { createCinematicIntent } from "../../lib/director-engine/cinematicIntent";
import { createCinematicDecision } from "../../lib/director-engine/cinematicDecision";
import { DirectorEngine, DirectorEngineResult } from "../../lib/director-engine/types";

/**
 * Testes de `ProcessSceneWithDirectorUseCaseImpl` (Task "Director
 * Engine — Orquestração"; `createCinematicIntent` integrado na Task
 * "Director Engine — Integrar CinematicIntent ao processamento";
 * `createCinematicDecision` integrado na Task "Director Engine —
 * Primeira Camada de Decisão Cinematográfica Determinística").
 * Puramente unitários — `SceneContextReader` e `DirectorEngine` são
 * fakes em memória (`vi.fn()`), nenhum Postgres necessário.
 * `createCinematicIntent`/`createCinematicDecision` NUNCA são mockadas
 * — são funções puras, os testes usam as implementações reais para
 * provar a transformação de verdade (não simular que ela aconteceu). O
 * teste de integração com o Composition Root real está no describe
 * separado no final deste arquivo.
 */

function buildContext(overrides: Partial<DirectorContext> = {}): DirectorContext {
  return {
    scene: { sceneId: "1", title: "Meia-noite tenebrosa", duration: "45s" },
    creativeBrief: { emotionalGoal: "Solidão contemplativa", narrativeGoal: "Estabelecer o luto" },
    assets: [],
    generatedAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

function buildResult(overrides: Partial<DirectorEngineResult> = {}): DirectorEngineResult {
  return {
    status: "PROCESSED",
    sceneId: "1",
    generatedAt: "2026-01-01T12:00:01.000Z",
    diagnostics: [],
    ...overrides,
  };
}

function buildFakes(context: DirectorContext, result: DirectorEngineResult) {
  const contextReader: SceneContextReader = { getDirectorContext: vi.fn().mockResolvedValue(context) };
  const directorEngine: DirectorEngine = { process: vi.fn().mockResolvedValue(result) };
  return { contextReader, directorEngine };
}

describe("ProcessSceneWithDirectorUseCaseImpl", () => {
  it("recebe sceneId e o repassa para SceneContextReader.getDirectorContext, exatamente uma vez", async () => {
    const { contextReader, directorEngine } = buildFakes(buildContext(), buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "42" });

    expect(contextReader.getDirectorContext).toHaveBeenCalledWith("42");
    expect(contextReader.getDirectorContext).toHaveBeenCalledTimes(1);
  });

  it("transforma o DirectorContext em CinematicIntent e depois em CinematicDecision (via funções reais) e entrega exatamente essa Decision ao DirectorEngine.process, uma única vez", async () => {
    const context = buildContext();
    const { contextReader, directorEngine } = buildFakes(context, buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "1" });

    const expectedDecision = createCinematicDecision(createCinematicIntent(context));
    expect(directorEngine.process).toHaveBeenCalledWith(expectedDecision);
    expect(directorEngine.process).toHaveBeenCalledTimes(1);
  });

  it("a CinematicDecision entregue ao Engine preserva os dados reais do DirectorContext (narrativo, emocional, duração), rastreáveis por categoria", async () => {
    const context = buildContext();
    const { contextReader, directorEngine } = buildFakes(context, buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "1" });

    const [decisionReceived] = (directorEngine.process as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(decisionReceived.sceneId).toBe("1");
    const byCategory = Object.fromEntries(decisionReceived.decisions.map((d: { category: string }) => [d.category, d]));
    expect(byCategory.NARRATIVE).toEqual({ category: "NARRATIVE", status: "AVAILABLE", value: "Estabelecer o luto", source: "narrativeObjective" });
    expect(byCategory.EMOTIONAL).toEqual({ category: "EMOTIONAL", status: "AVAILABLE", value: "Solidão contemplativa", source: "emotionalObjective" });
    expect(byCategory.PACING).toEqual({ category: "PACING", status: "AVAILABLE", value: "45s", source: "pacingIntent.duration" });
  });

  it("retorna exatamente o resultado produzido pelo DirectorEngine, sem transformação", async () => {
    const result = buildResult({ status: "PROCESSED", sceneId: "1", diagnostics: [] });
    const { contextReader, directorEngine } = buildFakes(buildContext(), result);
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    const returned = await useCase.execute({ sceneId: "1" });

    expect(returned).toBe(result);
  });

  it("não modifica o DirectorContext obtido do ContextReader", async () => {
    const context = buildContext();
    const snapshot = JSON.parse(JSON.stringify(context));
    const { contextReader, directorEngine } = buildFakes(context, buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "1" });

    expect(context).toEqual(snapshot);
  });

  it("um DirectorContext mínimo (sem creativeBrief) continua funcionando — Decision resultante com as 8 categorias UNAVAILABLE, Engine ainda é chamado", async () => {
    const context = buildContext({ scene: { sceneId: "1" }, creativeBrief: undefined });
    const { contextReader, directorEngine } = buildFakes(context, buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "1" });

    const expectedDecision = createCinematicDecision(createCinematicIntent(context));
    expect(directorEngine.process).toHaveBeenCalledWith(expectedDecision);
    expect(expectedDecision.decisions.every((d) => d.status === "UNAVAILABLE")).toBe(true);
  });

  it("propaga o erro do ContextReader tal como recebido, e NÃO chama o DirectorEngine (nenhum dado é criado artificialmente para continuar)", async () => {
    const error = new Error("Falha ao ler o DirectorContext.");
    const contextReader: SceneContextReader = { getDirectorContext: vi.fn().mockRejectedValue(error) };
    const directorEngine: DirectorEngine = { process: vi.fn() };
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await expect(useCase.execute({ sceneId: "1" })).rejects.toBe(error);
    expect(directorEngine.process).not.toHaveBeenCalled();
  });

  it("propaga o erro do DirectorEngine tal como recebido", async () => {
    const error = new Error("Falha ao processar a CinematicDecision.");
    const contextReader: SceneContextReader = { getDirectorContext: vi.fn().mockResolvedValue(buildContext()) };
    const directorEngine: DirectorEngine = { process: vi.fn().mockRejectedValue(error) };
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await expect(useCase.execute({ sceneId: "1" })).rejects.toBe(error);
  });

  it("depende só das duas interfaces injetadas via construtor — nenhuma infraestrutura concreta é acessada (reforçado por tests/architecture/director-engine-boundaries.test.ts)", () => {
    const contextReader: SceneContextReader = { getDirectorContext: vi.fn() };
    const directorEngine: DirectorEngine = { process: vi.fn() };

    expect(() => new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine)).not.toThrow();
  });
});

describe("Integração — sceneId -> container real -> SceneContextReader real -> DirectorContext -> createCinematicIntent -> CinematicIntent -> createCinematicDecision -> CinematicDecision -> DirectorEngine real", () => {
  it("processSceneWithDirectorUseCase (composto por lib/director-engine/container.ts) executa a cadeia completa, incluindo a Decision no resultado", async () => {
    const { processSceneWithDirectorUseCase } = await import("../../lib/director-engine/container");

    const result = await processSceneWithDirectorUseCase.execute({ sceneId: "1" });

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("1");
    expect(result.decision?.sceneId).toBe("1");
    expect(result.decision?.decisions).toHaveLength(8);
    expect(() => JSON.stringify(result)).not.toThrow();
    // Só leitura — nenhum dado é criado (a Scene "1" já existe no mock de lib/data.ts;
    // os Assets vinculados, se houver, já existiam antes deste teste rodar).

    // CinematicAnalysisReport (Task "Director Engine — Relatório Cinematográfico
    // Determinístico por Cena"): derivado da mesma Decision acima, sem interpretar
    // conteúdo criativo.
    expect(result.analysisReport).toBeDefined();
    expect(result.analysisReport?.sceneId).toBe("1");
    expect((result.analysisReport?.summary.availableCount ?? 0) + (result.analysisReport?.summary.unavailableCount ?? 0)).toBe(8);
    expect(result.analysisReport?.summary.totalCategories).toBe(8);
    expect(result.analysisReport?.categories).toHaveLength(8);
    expect([...(result.analysisReport?.summary.availableCategories ?? []), ...(result.analysisReport?.summary.unavailableCategories ?? [])].sort()).toEqual(
      result.decision?.decisions.map((d) => d.category).sort()
    );
    expect(result.analysisReport?.missingFields).toEqual(result.analysisReport?.summary.unavailableCategories);
  });

  it("para um sceneId sem Scene correspondente, ainda assim processa (Decision com as 8 categorias UNAVAILABLE) sem lançar — comportamento tolerante preservado", async () => {
    const { processSceneWithDirectorUseCase } = await import("../../lib/director-engine/container");

    const result = await processSceneWithDirectorUseCase.execute({ sceneId: "cena-que-nao-existe-no-mock" });

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("cena-que-nao-existe-no-mock");
    expect(result.decision?.decisions.every((d) => d.status === "UNAVAILABLE")).toBe(true);

    // CinematicAnalysisReport para uma Decision totalmente UNAVAILABLE: nenhuma categoria disponível, todas em missingFields.
    expect(result.analysisReport).toBeDefined();
    expect(result.analysisReport?.sceneId).toBe("cena-que-nao-existe-no-mock");
    expect(result.analysisReport?.summary.availableCategories).toEqual([]);
    expect(result.analysisReport?.summary).toEqual({
      availableCategories: [],
      unavailableCategories: ["NARRATIVE", "EMOTIONAL", "CAMERA", "LIGHTING", "PALETTE", "AUDIO", "PACING", "CONSTRAINTS"],
      totalCategories: 8,
      availableCount: 0,
      unavailableCount: 8,
    });
    expect(result.analysisReport?.categories.every((c) => c.requirement === "MISSING")).toBe(true);
  });
});
