// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SceneAssetsPanel from "../../../components/sceneAssets/SceneAssetsPanel";
import { ASSET_DRAG_MIME_TYPE } from "../../../components/assets/AssetCard";
import { ToastProvider } from "../../../components/providers/ToastProvider";

/**
 * Testes de integração do painel "Assets da cena" embutido em cada cena
 * do Storyboard (Sprint 2.0 — Asset Binding Engine; rotas migradas para
 * `/api/scenes/:sceneId/assets*` na Task "Scene Asset Binding"; reordenar,
 * trocar papel e confirmação de remoção adicionados na Task "Scene Asset
 * Binding — Storyboard Integration"). `fetch` é mockado — o componente só
 * fala com essas rotas e `/api/assets*` (nunca Service/Repository/Storage
 * diretamente), então mockar `fetch` é suficiente para testar o fluxo
 * completo sem servidor real. `ToastProvider` é necessário porque o
 * painel usa `useToast` para feedback de sucesso/erro nas mutações.
 */

function renderPanel(props: { sceneId?: string; projectId?: string } = {}) {
  return render(
    <ToastProvider>
      <SceneAssetsPanel sceneId={props.sceneId ?? "12"} projectId={props.projectId ?? "o-corvo"} />
    </ToastProvider>
  );
}

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

function buildSceneAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "scene-asset-1",
    sceneId: "12",
    assetId: "asset-1",
    role: "REFERENCE_IMAGE",
    order: 0,
    metadata: null,
    createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T10:00:00Z").toISOString(),
    asset: {
      id: "asset-1",
      name: "poster.png",
      type: "image",
      mimeType: "image/png",
      extension: "png",
      size: 204800,
      status: "READY",
      storageProvider: null,
    },
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function dataTransferFor(assetId: string) {
  const store = new Map<string, string>();
  store.set(ASSET_DRAG_MIME_TYPE, assetId);
  store.set("text/plain", assetId);
  return {
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
    effectAllowed: "",
  };
}

describe("SceneAssetsPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("mostra estado de carregamento e depois o estado vazio (com a cópia amigável) quando a cena não tem assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [])));

    renderPanel();

    expect(screen.getByTestId("scene-assets-loading")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId("scene-assets-empty")).toBeInTheDocument());
    expect(screen.getByTestId("scene-asset-counter")).toHaveTextContent("Cena 12 · 0 Assets");
    expect(screen.getByText("Esta cena ainda não possui Assets.")).toBeInTheDocument();
    expect(
      screen.getByText("Adicione referências visuais, personagens, ambientes ou objetos para começar.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar Asset/ })).toBeInTheDocument();
  });

  it("carrega e mostra os cards com o contador, tipo, tamanho e data corretos", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();

    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());
    expect(screen.getByTestId("scene-asset-counter")).toHaveTextContent("Cena 12 · 1 Asset");
    expect(fetchMock).toHaveBeenCalledWith("/api/scenes/12/assets");
    expect(screen.getByText("poster.png")).toBeInTheDocument();
    expect(screen.getByText("Imagem")).toBeInTheDocument();
    expect(screen.getByText("200.0 KB")).toBeInTheDocument();
  });

  it("mostra erro com botão de tentar novamente quando a listagem falha, e recarrega ao clicar", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(500, { error: { message: "falhou" } }));
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();

    await waitFor(() => expect(screen.getByText("Não foi possível carregar os assets da cena.")).toBeInTheDocument());

    fetchMock.mockImplementation(() => jsonResponse(200, [buildSceneAsset()]));
    fireEvent.click(screen.getByText("Tentar novamente"));

    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());
    expect(screen.queryByText("Não foi possível carregar os assets da cena.")).not.toBeInTheDocument();
  });

  it("abre o seletor de Assets ao clicar em \"+ Adicionar Asset\"", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [])));

    renderPanel();
    await waitFor(() => expect(screen.getByTestId("scene-assets-empty")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Adicionar Asset/ }));

    expect(await screen.findByText("Vincular Asset — Cena 12")).toBeInTheDocument();
  });

  it("vincula um asset ao clicar num item da Biblioteca dentro do seletor", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url === "/api/scenes/12/assets") {
        return jsonResponse(201, buildSceneAsset());
      }
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, []);
      }
      if (typeof url === "string" && url.startsWith("/api/assets?")) {
        return jsonResponse(200, [buildAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByTestId("scene-assets-empty")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Adicionar Asset/ }));
    await screen.findByText("Vincular Asset — Cena 12");

    await waitFor(() => expect(screen.getAllByText("poster.png")).not.toHaveLength(0));
    fireEvent.click(screen.getAllByText("poster.png")[screen.getAllByText("poster.png").length - 1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/scenes/12/assets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ assetId: "asset-1", role: "REFERENCE_IMAGE" }),
        })
      )
    );
  });

  it("busca e filtra por tipo dentro do seletor", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/assets?")) {
        return jsonResponse(200, [
          buildAsset({ id: "a1", name: "imagem.png", type: "image", extension: "png" }),
          buildAsset({ id: "a2", name: "audio.mp3", type: "audio", extension: "mp3" }),
        ]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByTestId("scene-assets-empty")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Adicionar Asset/ }));
    await screen.findByText("imagem.png");
    expect(screen.getByText("audio.mp3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Áudio" }));
    expect(screen.queryByText("imagem.png")).not.toBeInTheDocument();
    expect(screen.getByText("audio.mp3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    fireEvent.change(screen.getByPlaceholderText("Buscar assets…"), { target: { value: "imagem" } });
    expect(screen.getByText("imagem.png")).toBeInTheDocument();
    expect(screen.queryByText("audio.mp3")).not.toBeInTheDocument();
  });

  it("pede confirmação antes de desvincular, e cancelar não chama DELETE", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Remover vínculo de poster.png"));
    expect(await screen.findByRole("heading", { name: "Remover vínculo" })).toBeInTheDocument();
    expect(screen.getByText(/Isso remove só o vínculo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Remover vínculo" })).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "DELETE" }));
    expect(screen.getByAltText("poster.png")).toBeInTheDocument();
  });

  it("desvincula um asset após confirmação, sem afetar o Asset original", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 204, json: async () => null });
      }
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Remover vínculo de poster.png"));
    await screen.findByRole("heading", { name: "Remover vínculo" });

    const confirmButtons = screen.getAllByRole("button", { name: "Remover vínculo" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/scenes/12/assets/scene-asset-1", { method: "DELETE" })
    );
    // A rota que apagaria o Asset original (/api/assets/:id) nunca é chamada com DELETE por este painel.
    expect(fetchMock).not.toHaveBeenCalledWith("/api/assets/asset-1", expect.objectContaining({ method: "DELETE" }));
    await waitFor(() => expect(screen.getByTestId("scene-assets-empty")).toBeInTheDocument());
  });

  it("altera o papel de um vínculo via seletor e reflete a mudança", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return jsonResponse(200, buildSceneAsset({ role: "CONCEPT_ART" }));
      }
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Papel de poster.png na cena"), { target: { value: "CONCEPT_ART" } });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/scenes/12/assets/scene-asset-1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ role: "CONCEPT_ART" }) })
      )
    );
  });

  it("move um asset para baixo trocando a ordem com o vizinho, e desabilita ↑ no primeiro / ↓ no último", async () => {
    const first = buildSceneAsset({ id: "sa-1", assetId: "a1", order: 0, asset: { ...buildSceneAsset().asset, id: "a1", name: "primeiro.png" } });
    const second = buildSceneAsset({ id: "sa-2", assetId: "a2", order: 1, asset: { ...buildSceneAsset().asset, id: "a2", name: "segundo.png" } });

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return jsonResponse(200, {});
      }
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, [first, second]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("primeiro.png")).toBeInTheDocument());

    expect(screen.getByLabelText("Mover primeiro.png para cima")).toBeDisabled();
    expect(screen.getByLabelText("Mover segundo.png para baixo")).toBeDisabled();
    expect(screen.getByLabelText("Mover primeiro.png para baixo")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("Mover primeiro.png para baixo"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/scenes/12/assets/sa-1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ order: 1 }) })
      )
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/scenes/12/assets/sa-2",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ order: 0 }) })
    );
  });

  it("desabilita os controles do card enquanto uma mutação está em andamento (evita duplo clique)", async () => {
    let resolvePatch: (() => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return new Promise((resolve) => {
          resolvePatch = () => resolve({ ok: true, status: 200, json: async () => buildSceneAsset() });
        });
      }
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Papel de poster.png na cena"), { target: { value: "CONCEPT_ART" } });

    await waitFor(() => expect(screen.getByLabelText("Remover vínculo de poster.png")).toBeDisabled());
    expect(screen.getByLabelText("Papel de poster.png na cena")).toBeDisabled();

    expect(screen.getByTestId("scene-asset-card-busy")).toHaveTextContent("Atualizando…");

    resolvePatch?.();
    await waitFor(() => expect(screen.getByLabelText("Remover vínculo de poster.png")).not.toBeDisabled());
    expect(screen.queryByTestId("scene-asset-card-busy")).not.toBeInTheDocument();
  });

  it("abre e fecha o preview ao clicar no botão \"Pré-visualizar\" (sem depender de hover)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
          return jsonResponse(200, [buildSceneAsset()]);
        }
        return jsonResponse(200, []);
      })
    );

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    expect(screen.queryByTestId("scene-asset-hover-preview")).not.toBeInTheDocument();

    const previewButton = screen.getByLabelText("Pré-visualizar poster.png");
    fireEvent.click(previewButton);
    expect(screen.getByTestId("scene-asset-hover-preview")).toBeInTheDocument();
    expect(previewButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(previewButton);
    expect(screen.queryByTestId("scene-asset-hover-preview")).not.toBeInTheDocument();
  });

  it("tem um botão de download por card, reaproveitando a rota existente de download do Asset Manager", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
          return jsonResponse(200, [buildSceneAsset()]);
        }
        return jsonResponse(200, []);
      })
    );

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    const downloadButton = screen.getByLabelText("Baixar poster.png");
    expect(downloadButton).toBeInTheDocument();

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fireEvent.click(downloadButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("vincula um asset ao soltar (drag and drop) direto sobre o painel", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url === "/api/scenes/12/assets") {
        return jsonResponse(201, buildSceneAsset());
      }
      if (url === "/api/assets/asset-1") {
        return jsonResponse(200, buildAsset());
      }
      if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
        return jsonResponse(200, []);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await waitFor(() => expect(screen.getByTestId("scene-assets-empty")).toBeInTheDocument());

    const panel = screen.getByTestId("scene-assets-panel");
    const dataTransfer = dataTransferFor("asset-1");
    fireEvent.dragOver(panel, { dataTransfer });
    fireEvent.drop(panel, { dataTransfer });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/scenes/12/assets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ assetId: "asset-1", role: "REFERENCE_IMAGE" }),
        })
      )
    );
  });

  it("mostra preview rápido ao passar o mouse sobre um card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
          return jsonResponse(200, [buildSceneAsset()]);
        }
        return jsonResponse(200, []);
      })
    );

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    expect(screen.queryByTestId("scene-asset-hover-preview")).not.toBeInTheDocument();

    const wrapper = screen.getByTestId("scene-asset-card");
    fireEvent.mouseEnter(wrapper);
    expect(await screen.findByTestId("scene-asset-hover-preview")).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    await waitFor(() => expect(screen.queryByTestId("scene-asset-hover-preview")).not.toBeInTheDocument());
  });

  it("mostra o selo de ordem (posição 1-based) no card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.startsWith("/api/scenes/12/assets")) {
          return jsonResponse(200, [buildSceneAsset({ order: 2 })]);
        }
        return jsonResponse(200, []);
      })
    );

    renderPanel();
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    expect(screen.getByTestId("scene-asset-order-badge")).toHaveTextContent("3");
  });
});
