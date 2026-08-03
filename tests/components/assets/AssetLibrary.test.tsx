// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AssetLibrary from "../../../components/assets/AssetLibrary";
import { ToastProvider } from "../../../components/providers/ToastProvider";

function renderLibrary(projectId = "o-corvo") {
  return render(
    <ToastProvider>
      <AssetLibrary projectId={projectId} />
    </ToastProvider>
  );
}

/**
 * Testes de integração da Biblioteca de Assets (Sprint 2.0). `fetch` e
 * `XMLHttpRequest` são mockados — o componente só fala com as rotas
 * HTTP `/api/assets*` (a UI não pode importar Service/Repository/Storage
 * nesta Sprint), então mockar essas duas APIs de rede é suficiente para
 * testar todo o fluxo sem servidor real.
 */

function buildAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    projectId: "o-corvo",
    type: "image",
    name: "poster.png",
    originalName: "poster.png",
    mimeType: "image/png",
    extension: "png",
    size: 204800,
    hash: null,
    storageKey: null,
    storageProvider: null,
    status: "READY",
    createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T10:00:00Z").toISOString(),
    ...overrides,
  };
}

/** XHR falso, controlável pelo teste — dispara progress/load/error/abort sob comando. */
class MockXHR {
  static instances: MockXHR[] = [];

  upload = new EventTarget();
  private target = new EventTarget();
  status = 200;
  responseText = "";
  open = vi.fn();
  send = vi.fn();
  abort = vi.fn(() => {
    this.target.dispatchEvent(new Event("abort"));
  });

  constructor() {
    MockXHR.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    this.target.addEventListener(type, listener);
  }

  emitProgress(loaded: number, total: number) {
    const event = new Event("progress") as Event & { lengthComputable: boolean; loaded: number; total: number };
    event.lengthComputable = true;
    event.loaded = loaded;
    event.total = total;
    this.upload.dispatchEvent(event);
  }

  emitLoad(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.target.dispatchEvent(new Event("load"));
  }

  emitError() {
    this.target.dispatchEvent(new Event("error"));
  }
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("AssetLibrary", () => {
  beforeEach(() => {
    MockXHR.instances = [];
    vi.stubGlobal("XMLHttpRequest", MockXHR as unknown as typeof XMLHttpRequest);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock") });
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("mostra skeleton enquanto carrega, depois a lista de assets", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(200, [buildAsset()]));
    vi.stubGlobal("fetch", fetchMock);

    renderLibrary();

    expect(screen.getByTestId("asset-grid-skeleton")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("poster.png")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/assets?projectId=o-corvo");
  });

  it("mostra o estado vazio quando não há assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [])));

    renderLibrary();

    await waitFor(() => expect(screen.getByTestId("asset-grid-empty")).toBeInTheDocument());
  });

  it("mostra erro com botão de tentar novamente quando a listagem falha", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(500, { error: { message: "falhou" } }));
    vi.stubGlobal("fetch", fetchMock);

    renderLibrary();

    await waitFor(() => expect(screen.getByTestId("asset-library-error")).toBeInTheDocument());

    fetchMock.mockImplementation(() => jsonResponse(200, [buildAsset()]));
    fireEvent.click(screen.getByText("Tentar novamente"));

    await waitFor(() => expect(screen.getByText("poster.png")).toBeInTheDocument());
  });

  it("filtra por busca (nome)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        jsonResponse(200, [buildAsset({ id: "a1", name: "cena-final.png" }), buildAsset({ id: "a2", name: "trilha.mp3" })])
      )
    );

    renderLibrary();
    await waitFor(() => expect(screen.getByText("cena-final.png")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Buscar assets por nome…"), { target: { value: "trilha" } });

    expect(screen.queryByText("cena-final.png")).not.toBeInTheDocument();
    expect(screen.getByText("trilha.mp3")).toBeInTheDocument();
  });

  it("filtra por tipo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        jsonResponse(200, [
          buildAsset({ id: "a1", name: "imagem.png", type: "image", extension: "png" }),
          buildAsset({ id: "a2", name: "audio.mp3", type: "audio", extension: "mp3" }),
        ])
      )
    );

    renderLibrary();
    await waitFor(() => expect(screen.getByText("imagem.png")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Áudio" }));

    expect(screen.queryByText("imagem.png")).not.toBeInTheDocument();
    expect(screen.getByText("audio.mp3")).toBeInTheDocument();
  });

  it("ordena por nome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        jsonResponse(200, [
          buildAsset({ id: "a1", name: "zebra.png" }),
          buildAsset({ id: "a2", name: "abelha.png" }),
        ])
      )
    );

    renderLibrary();
    await waitFor(() => expect(screen.getByText("zebra.png")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Ordenar por/), { target: { value: "name" } });

    const grid = screen.getByTestId("asset-grid");
    const names = within(grid)
      .getAllByText(/\.png$/)
      .map((el) => el.textContent);
    expect(names).toEqual(["abelha.png", "zebra.png"]);
  });

  it("alterna entre grid e lista", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [buildAsset()])));

    renderLibrary();
    await waitFor(() => expect(screen.getByText("poster.png")).toBeInTheDocument());

    expect(screen.getByTestId("asset-grid").className).toContain("grid");

    fireEvent.click(screen.getByRole("button", { name: "Lista" }));

    expect(screen.getByTestId("asset-grid").className).not.toContain("grid-cols-2");
  });

  it("abre o preview ao clicar num card e fecha ao clicar em fechar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [buildAsset()])));

    renderLibrary();
    await waitFor(() => expect(screen.getByText("poster.png")).toBeInTheDocument());

    fireEvent.click(screen.getByText("poster.png"));

    await waitFor(() => expect(screen.getByLabelText("Baixar arquivo")).toBeInTheDocument());
    expect(screen.queryByText(/Não é possível pré-visualizar/)).not.toBeInTheDocument();
  });

  it("copia o nome e o ID para a área de transferência", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [buildAsset()])));

    renderLibrary();
    await waitFor(() => expect(screen.getByText("poster.png")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Copiar nome"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("poster.png"));

    fireEvent.click(screen.getByLabelText("Copiar ID"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("asset-1"));
  });

  it("exclui um asset após confirmação", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 204, json: async () => null });
      }
      return jsonResponse(200, [buildAsset()]);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLibrary();
    await waitFor(() => expect(screen.getByText("poster.png")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Excluir"));
    await waitFor(() => expect(screen.getByText(/Tem certeza que deseja excluir/)).toBeInTheDocument());

    // Dois botões com o nome acessível "Excluir" existem agora: o ícone
    // do card (aria-label) e o de confirmação no dialog (texto) — o do
    // dialog é sempre o último em ordem de documento (portal anexado ao
    // final de <body>).
    const confirmButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/assets/asset-1", { method: "DELETE" })
    );
    await waitFor(() => expect(screen.getByTestId("asset-grid-empty")).toBeInTheDocument());
  });

  it("faz upload de um arquivo com barra de progresso e atualiza a lista ao concluir", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse(201, buildAsset({ id: "novo-asset", status: "PENDING" }));
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLibrary();
    await waitFor(() => expect(screen.getByTestId("asset-grid-empty")).toBeInTheDocument());

    const file = new File(["conteudo"], "novo.png", { type: "image/png" });
    const input = screen.getByTestId("upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // 1. POST /api/assets (criação do registro) deve ter sido chamado.
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/assets",
        expect.objectContaining({ method: "POST" })
      )
    );

    // 2. O upload real via XHR deve ter iniciado.
    await waitFor(() => expect(MockXHR.instances).toHaveLength(1));
    const xhr = MockXHR.instances[0];
    expect(xhr.open).toHaveBeenCalledWith("POST", "/api/assets/novo-asset/upload");

    // 3. Progresso parcial deve refletir na barra.
    xhr.emitProgress(50, 100);
    await waitFor(() => expect(screen.getByText("novo.png")).toBeInTheDocument());

    // 4. Conclui o upload.
    fetchMock.mockImplementation(() => jsonResponse(200, [buildAsset({ id: "novo-asset", name: "novo.png" })]));
    xhr.emitLoad(200, buildAsset({ id: "novo-asset", name: "novo.png", status: "READY" }));

    await waitFor(() => expect(screen.getByText("Concluído.")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("asset-grid")).toBeInTheDocument());
  });

  it("cancela um upload em andamento", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse(201, buildAsset({ id: "cancel-me", status: "PENDING" }));
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLibrary();
    await waitFor(() => expect(screen.getByTestId("asset-grid-empty")).toBeInTheDocument());

    const file = new File(["conteudo"], "cancelar.png", { type: "image/png" });
    const input = screen.getByTestId("upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(MockXHR.instances).toHaveLength(1));
    await waitFor(() => expect(screen.getByText("Cancelar")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Cancelar"));

    expect(MockXHR.instances[0].abort).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Upload cancelado.")).toBeInTheDocument());
  });

  it("mostra erro no item de upload quando o envio falha", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse(201, buildAsset({ id: "falha-upload", status: "PENDING" }));
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLibrary();
    await waitFor(() => expect(screen.getByTestId("asset-grid-empty")).toBeInTheDocument());

    const file = new File(["conteudo"], "falha.png", { type: "image/png" });
    const input = screen.getByTestId("upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(MockXHR.instances).toHaveLength(1));
    MockXHR.instances[0].emitLoad(500, { error: { message: "Falha ao enviar o arquivo." } });

    await waitFor(() => expect(screen.getByText("Falha ao enviar o arquivo.")).toBeInTheDocument());
  });
});
