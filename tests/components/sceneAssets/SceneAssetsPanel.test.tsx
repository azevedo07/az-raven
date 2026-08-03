// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SceneAssetsPanel from "../../../components/sceneAssets/SceneAssetsPanel";
import { ASSET_DRAG_MIME_TYPE } from "../../../components/assets/AssetCard";

/**
 * Testes de integração do painel "📎 Assets" embutido em cada cena do
 * Storyboard (Sprint 2.0 — Asset Binding Engine). `fetch` é mockado — o
 * componente só fala com `/api/scene-assets*` e `/api/assets*` (nunca
 * Service/Repository/Storage diretamente), então mockar `fetch` é
 * suficiente para testar o fluxo completo sem servidor real.
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

function buildSceneAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "scene-asset-1",
    sceneId: "12",
    assetId: "asset-1",
    role: "REFERENCE_IMAGE",
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

  it("mostra estado vazio e o contador zerado quando a cena não tem assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [])));

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByText(/Nenhum asset vinculado/)).toBeInTheDocument());
    expect(screen.getByTestId("scene-asset-counter")).toHaveTextContent("Cena 12 · 0 Assets");
  });

  it("carrega e mostra miniaturas com o contador correto", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/scene-assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());
    expect(screen.getByTestId("scene-asset-counter")).toHaveTextContent("Cena 12 · 1 Asset");
    expect(fetchMock).toHaveBeenCalledWith("/api/scene-assets?sceneId=12");
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(500, { error: { message: "falhou" } })));

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);

    await waitFor(() => expect(screen.getByText("Não foi possível carregar os assets da cena.")).toBeInTheDocument());
  });

  it("abre a Biblioteca de Assets ao clicar em 📎 Assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(200, [])));

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByText(/Nenhum asset vinculado/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Assets/ }));

    expect(await screen.findByText("Vincular Asset — Cena 12")).toBeInTheDocument();
  });

  it("vincula um asset ao clicar num item da Biblioteca dentro do picker", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url === "/api/scene-assets") {
        return jsonResponse(201, buildSceneAsset());
      }
      if (typeof url === "string" && url.startsWith("/api/scene-assets")) {
        return jsonResponse(200, init?.method === "POST" ? [] : []);
      }
      if (typeof url === "string" && url.startsWith("/api/assets?")) {
        return jsonResponse(200, [buildAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByText(/Nenhum asset vinculado/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Assets/ }));
    await screen.findByText("Vincular Asset — Cena 12");

    await waitFor(() => expect(screen.getAllByText("poster.png")).not.toHaveLength(0));
    fireEvent.click(screen.getAllByText("poster.png")[screen.getAllByText("poster.png").length - 1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/scene-assets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ sceneId: "12", assetId: "asset-1", role: "REFERENCE_IMAGE" }),
        })
      )
    );
  });

  it("filtra e busca dentro do picker", async () => {
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

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByText(/Nenhum asset vinculado/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Assets/ }));
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

  it("desvincula um asset ao clicar no botão de remover da miniatura", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 204, json: async () => null });
      }
      if (typeof url === "string" && url.startsWith("/api/scene-assets")) {
        return jsonResponse(200, [buildSceneAsset()]);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Desvincular poster.png"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/scene-assets/scene-asset-1", { method: "DELETE" })
    );
    await waitFor(() => expect(screen.getByText(/Nenhum asset vinculado/)).toBeInTheDocument());
  });

  it("vincula um asset ao soltar (drag and drop) direto sobre o painel", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url === "/api/scene-assets") {
        return jsonResponse(201, buildSceneAsset());
      }
      if (url === "/api/assets/asset-1") {
        return jsonResponse(200, buildAsset());
      }
      if (typeof url === "string" && url.startsWith("/api/scene-assets")) {
        return jsonResponse(200, []);
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByText(/Nenhum asset vinculado/)).toBeInTheDocument());

    const panel = screen.getByTestId("scene-assets-panel");
    const dataTransfer = dataTransferFor("asset-1");
    fireEvent.dragOver(panel, { dataTransfer });
    fireEvent.drop(panel, { dataTransfer });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/scene-assets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ sceneId: "12", assetId: "asset-1", role: "REFERENCE_IMAGE" }),
        })
      )
    );
  });

  it("mostra preview rápido ao passar o mouse sobre uma miniatura", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.startsWith("/api/scene-assets")) {
          return jsonResponse(200, [buildSceneAsset()]);
        }
        return jsonResponse(200, []);
      })
    );

    render(<SceneAssetsPanel sceneId="12" projectId="o-corvo" />);
    await waitFor(() => expect(screen.getByAltText("poster.png")).toBeInTheDocument());

    expect(screen.queryByTestId("scene-asset-hover-preview")).not.toBeInTheDocument();

    const wrapper = screen.getByAltText("poster.png").closest(".group\\/thumb") as Element;
    fireEvent.mouseEnter(wrapper);
    expect(await screen.findByTestId("scene-asset-hover-preview")).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    await waitFor(() => expect(screen.queryByTestId("scene-asset-hover-preview")).not.toBeInTheDocument());
  });
});
