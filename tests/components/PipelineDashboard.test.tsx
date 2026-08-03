// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import PipelineDashboard from "../../components/PipelineDashboard";

/**
 * Teste de UI do Dashboard de Execução (Sprint 1.5, Task 3). `fetch` é
 * mockado diretamente — o componente é um Client Component que só
 * consome `GET /api/pipeline/:projectId/dashboard` via `fetch`, então
 * mockar a resposta HTTP é suficiente para testar a renderização sem
 * precisar de servidor ou banco reais.
 */
describe("PipelineDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("busca o dashboard via fetch e exibe status, módulos e contagens", async () => {
    const payload = {
      projectId: "o-corvo",
      projectStatus: "running",
      currentModule: "production",
      progress: 67,
      totalModules: 12,
      completedModules: 8,
      activeModules: 1,
      failedModules: 0,
      pendingModules: 3,
      pausedModules: 0,
      eventCount: 5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextModule: null,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineDashboard projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByText("Em execução")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledWith("/api/pipeline/o-corvo/dashboard");
    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(screen.getByText("8 de 12")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("exibe uma mensagem de erro quando a API responde com falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineDashboard projectId="projeto-inexistente" />);

    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar o dashboard do pipeline.")).toBeInTheDocument()
    );
  });
});
