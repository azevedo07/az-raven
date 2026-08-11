import { describe, expect, it, vi } from "vitest";
import { ProcessSceneWithDirectorUseCaseImpl } from "../../lib/director-engine/use-cases/processSceneWithDirectorUseCase";
import { SceneContextReader } from "../../lib/director-context/sceneContextReader";
import { DirectorContext } from "../../lib/director-context/types";
import { DirectorEngine, DirectorEngineResult } from "../../lib/director-engine/types";

/**
 * Testes de `ProcessSceneWithDirectorUseCaseImpl` (Task "Director
 * Engine — Orquestração"). Puramente unitários — `SceneContextReader` e
 * `DirectorEngine` são fakes em memória (`vi.fn()`), nenhum Postgres
 * necessário. O teste de integração com o Composition Root real está
 * no describe separado no final deste arquivo.
 */

function buildContext(overrides: Partial<DirectorContext> = {}): DirectorContext {
  return {
    scene: { sceneId: "1", title: "Meia-noite tenebrosa" },
    assets: [],
    generatedAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

function buildAsset(): DirectorContext["assets"][number] {
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
  it("recebe sceneId e o repassa para SceneContextReader.getDirectorContext", async () => {
    const { contextReader, directorEngine } = buildFakes(buildContext(), buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "42" });

    expect(contextReader.getDirectorContext).toHaveBeenCalledWith("42");
    expect(contextReader.getDirectorContext).toHaveBeenCalledTimes(1);
  });

  it("entrega exatamente o DirectorContext devolvido pelo ContextReader ao DirectorEngine.process, exatamente uma vez", async () => {
    const context = buildContext({ assets: [buildAsset()] });
    const { contextReader, directorEngine } = buildFakes(context, buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "1" });

    expect(directorEngine.process).toHaveBeenCalledWith(context);
    expect(directorEngine.process).toHaveBeenCalledTimes(1);
  });

  it("retorna exatamente o resultado produzido pelo DirectorEngine, sem transformação", async () => {
    const result = buildResult({ status: "PROCESSED", sceneId: "1", diagnostics: [] });
    const { contextReader, directorEngine } = buildFakes(buildContext(), result);
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    const returned = await useCase.execute({ sceneId: "1" });

    expect(returned).toBe(result);
  });

  it("não modifica o DirectorContext obtido do ContextReader", async () => {
    const context = buildContext({ assets: [buildAsset()] });
    const snapshot = JSON.parse(JSON.stringify(context));
    const { contextReader, directorEngine } = buildFakes(context, buildResult());
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await useCase.execute({ sceneId: "1" });

    expect(context).toEqual(snapshot);
  });

  it("propaga o erro do ContextReader tal como recebido, e NÃO chama o DirectorEngine", async () => {
    const error = new Error("Falha ao ler o DirectorContext.");
    const contextReader: SceneContextReader = { getDirectorContext: vi.fn().mockRejectedValue(error) };
    const directorEngine: DirectorEngine = { process: vi.fn() };
    const useCase = new ProcessSceneWithDirectorUseCaseImpl(contextReader, directorEngine);

    await expect(useCase.execute({ sceneId: "1" })).rejects.toBe(error);
    expect(directorEngine.process).not.toHaveBeenCalled();
  });

  it("propaga o erro do DirectorEngine tal como recebido", async () => {
    const error = new Error("Falha ao processar o DirectorContext.");
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

describe("Integração — sceneId -> container real -> SceneContextReader real -> DirectorContext -> DirectorEngine real", () => {
  it("processSceneWithDirectorUseCase (composto por lib/director-engine/container.ts) executa a cadeia completa", async () => {
    const { processSceneWithDirectorUseCase } = await import("../../lib/director-engine/container");

    const result = await processSceneWithDirectorUseCase.execute({ sceneId: "1" });

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("1");
    expect(() => JSON.stringify(result)).not.toThrow();
    // Só leitura — nenhum dado é criado (a Scene "1" já existe no mock de lib/data.ts;
    // os Assets vinculados, se houver, já existiam antes deste teste rodar).
  });

  it("para um sceneId sem Scene correspondente, ainda assim processa (context.scene só com sceneId) sem lançar", async () => {
    const { processSceneWithDirectorUseCase } = await import("../../lib/director-engine/container");

    const result = await processSceneWithDirectorUseCase.execute({ sceneId: "cena-que-nao-existe-no-mock" });

    expect(result.status).toBe("PROCESSED");
    expect(result.sceneId).toBe("cena-que-nao-existe-no-mock");
  });
});
