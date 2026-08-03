// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PipelineVersions from "../../components/PipelineVersions";

/**
 * Teste de UI de Versões do Pipeline (Sprint 1.5, Task 4). `fetch` é
 * mockado diretamente — o componente é um Client Component que só
 * consome `GET`/`POST /api/pipeline/:projectId/versions` via `fetch`.
 */
describe("PipelineVersions", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista as versões existentes e exibe a contagem", async () => {
    const versions = [
      { id: "v2", name: "Segunda Versão", createdAt: new Date("2026-01-02T10:00:00Z").toISOString() },
      { id: "v1", name: "Versão Inicial", createdAt: new Date("2026-01-01T10:00:00Z").toISOString() },
    ];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => versions });
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineVersions projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByText("Versão Inicial")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledWith("/api/pipeline/o-corvo/versions");
    expect(screen.getByText("Segunda Versão")).toBeInTheDocument();
    expect(screen.getByText("Versões (2)")).toBeInTheDocument();
  });

  it("exibe o estado vazio quando não há nenhuma versão salva", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineVersions projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByText("Nenhuma versão salva ainda.")).toBeInTheDocument());
  });

  it("abre o dialog, envia o POST com o nome informado e atualiza a lista", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (!init) {
        // GET inicial (lista vazia) e GET de recarga após criar.
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      // POST /versions
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "v1", name: "Versão Inicial", createdAt: new Date().toISOString() }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineVersions projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByText("Nenhuma versão salva ainda.")).toBeInTheDocument());

    fireEvent.click(screen.getByText("NOVA VERSÃO"));
    const input = await screen.findByPlaceholderText("Ex: Versão Inicial");
    fireEvent.change(input, { target: { value: "Versão Inicial" } });
    fireEvent.click(screen.getByText("Salvar versão"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pipeline/o-corvo/versions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Versão Inicial" }),
        })
      )
    );

    // Depois do POST, o componente recarrega a lista via GET — o mock
    // atual devolve `[]` para GET, então o dialog deve fechar e o
    // estado vazio permanece (o que importa aqui é o fluxo completo:
    // abrir → preencher → POST → recarregar).
    await waitFor(() => expect(screen.queryByPlaceholderText("Ex: Versão Inicial")).not.toBeInTheDocument());
  });

  it("cancelar a confirmação de restauração não faz nenhum POST", async () => {
    const versions = [{ id: "v1", name: "Versão Inicial", createdAt: new Date().toISOString() }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => versions });
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineVersions projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByText("Versão Inicial")).toBeInTheDocument());

    fireEvent.click(screen.getByText("RESTAURAR"));
    await waitFor(() =>
      expect(screen.getByText(/Tem certeza que deseja restaurar esta versão/)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() =>
      expect(screen.queryByText(/Tem certeza que deseja restaurar esta versão/)).not.toBeInTheDocument()
    );

    expect(fetchMock).toHaveBeenCalledTimes(1); // só o GET inicial.
  });

  it("confirmar a restauração faz POST no endpoint de restore, recarrega a lista e chama onRestored", async () => {
    const versions = [{ id: "v1", name: "Versão Inicial", createdAt: new Date().toISOString() }];
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ state: {}, projectStatus: "running" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => versions });
    });
    vi.stubGlobal("fetch", fetchMock);
    const onRestored = vi.fn();

    render(<PipelineVersions projectId="o-corvo" onRestored={onRestored} />);
    await waitFor(() => expect(screen.getByText("Versão Inicial")).toBeInTheDocument());

    fireEvent.click(screen.getByText("RESTAURAR"));
    await waitFor(() =>
      expect(screen.getByText(/Tem certeza que deseja restaurar esta versão/)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Restaurar"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/pipeline/o-corvo/versions/v1/restore", { method: "POST" })
    );
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText(/Tem certeza que deseja restaurar esta versão/)).not.toBeInTheDocument()
    );
  });
});
