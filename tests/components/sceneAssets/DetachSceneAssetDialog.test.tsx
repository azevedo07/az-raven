// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DetachSceneAssetDialog from "../../../components/sceneAssets/DetachSceneAssetDialog";
import { SceneAssetRecord } from "../../../components/sceneAssets/utils";

/**
 * Testes do diálogo de confirmação antes de desvincular um Asset de uma
 * cena (Task "Scene Asset Binding — Storyboard Integration"). Mesmo
 * padrão de `components/assets/DeleteDialog.tsx`.
 */

function buildSceneAsset(overrides: Partial<SceneAssetRecord> = {}): SceneAssetRecord {
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

describe("DetachSceneAssetDialog", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("não renderiza nada quando sceneAsset é null", () => {
    render(<DetachSceneAssetDialog sceneAsset={null} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText("Remover vínculo")).not.toBeInTheDocument();
  });

  it("mostra o nome do asset e deixa explícito que o Asset original não é apagado", () => {
    render(<DetachSceneAssetDialog sceneAsset={buildSceneAsset()} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Remover vínculo" })).toBeInTheDocument();
    expect(screen.getByText(/poster\.png/)).toBeInTheDocument();
    expect(screen.getByText(/continua disponível na Biblioteca de Assets/)).toBeInTheDocument();
  });

  it("chama onClose ao cancelar, sem chamar onConfirm", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<DetachSceneAssetDialog sceneAsset={buildSceneAsset()} onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("chama onConfirm com o sceneAsset ao confirmar, e mostra estado de carregamento", async () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );
    const sceneAsset = buildSceneAsset();
    render(<DetachSceneAssetDialog sceneAsset={sceneAsset} onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover vínculo" }));

    expect(onConfirm).toHaveBeenCalledWith(sceneAsset);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    resolveConfirm?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).not.toBeDisabled());
  });

  it("mostra uma mensagem de erro inline se onConfirm falhar, sem fechar o diálogo", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Não foi possível remover o vínculo."));
    const onClose = vi.fn();
    render(<DetachSceneAssetDialog sceneAsset={buildSceneAsset()} onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover vínculo" }));

    await waitFor(() => expect(screen.getByText("Não foi possível remover o vínculo.")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Remover vínculo" })).toBeInTheDocument();
  });

  it("o botão Cancelar fica desabilitado (não fecha) enquanto a remoção está em andamento", () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );
    const onClose = vi.fn();
    render(<DetachSceneAssetDialog sceneAsset={buildSceneAsset()} onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover vínculo" }));
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).not.toHaveBeenCalled();
    resolveConfirm?.();
  });
});
