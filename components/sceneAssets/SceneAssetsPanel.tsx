"use client";

import { useCallback, useEffect, useState } from "react";
import { ASSET_DRAG_MIME_TYPE } from "../assets/AssetCard";
import { deriveDisplayType } from "../assets/utils";
import SceneAssetPicker from "./SceneAssetPicker";
import SceneAssetThumbnail from "./SceneAssetThumbnail";
import { defaultRoleForDisplayType, SceneAssetRecord } from "./utils";

interface SceneAssetsPanelProps {
  sceneId: string;
  projectId: string;
}

/**
 * Painel "📎 Assets" embutido em cada `SceneCard` (Sprint 2.0; rotas
 * migradas para `/api/scenes/:sceneId/assets*` na Task "Scene Asset
 * Binding"). Só fala com essas rotas HTTP — nunca com Service/
 * Repository/Storage diretamente. Aceita dois caminhos para vincular um
 * Asset: abrir `SceneAssetPicker` (clique) ou soltar um card arrastado
 * da Biblioteca direto sobre o painel.
 */
export default function SceneAssetsPanel({ sceneId, projectId }: SceneAssetsPanelProps) {
  const [sceneAssets, setSceneAssets] = useState<SceneAssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/scenes/${encodeURIComponent(sceneId)}/assets`)
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os assets da cena.");
        return response.json();
      })
      .then((data: SceneAssetRecord[]) => setSceneAssets(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro desconhecido."));
  }, [sceneId]);

  useEffect(() => {
    load();
  }, [load]);

  const attach = useCallback(
    async (assetId: string, role: string) => {
      const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, role }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Não foi possível vincular o asset.");
      }
      load();
    },
    [sceneId, load]
  );

  async function detach(sceneAsset: SceneAssetRecord) {
    setSceneAssets((prev) => prev?.filter((sa) => sa.id !== sceneAsset.id) ?? prev);
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/assets/${sceneAsset.id}`, {
      method: "DELETE",
    });
    if (!response.ok && response.status !== 404) {
      load();
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    const assetId = e.dataTransfer.getData(ASSET_DRAG_MIME_TYPE) || e.dataTransfer.getData("text/plain");
    if (!assetId) return;

    setDropError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`);
      const role = response.ok ? defaultRoleForDisplayType(deriveDisplayType(await response.json())) : "OUTRO";
      await attach(assetId, role);
    } catch (err) {
      setDropError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }

  const count = sceneAssets?.length ?? 0;
  const linkedAssetIds = sceneAssets?.map((sa) => sa.assetId) ?? [];

  return (
    <div
      data-testid="scene-assets-panel"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={[
        "mt-3 rounded-md border p-2.5 transition-colors",
        isDraggingOver ? "border-accent bg-accentSoft" : "border-border",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 text-[11.5px] font-medium text-textSecondary transition-colors hover:text-accent"
        >
          <span aria-hidden>📎</span> Assets
        </button>
        <span data-testid="scene-asset-counter" className="text-[10.5px] text-textTertiary">
          Cena {sceneId} · {count} {count === 1 ? "Asset" : "Assets"}
        </span>
      </div>

      {error && <p className="text-[11px] text-danger">{error}</p>}
      {dropError && <p className="text-[11px] text-danger">{dropError}</p>}

      {sceneAssets === null && !error ? (
        <p className="text-[11px] text-textTertiary">Carregando…</p>
      ) : count === 0 ? (
        <p className="text-[11px] text-textTertiary">
          Nenhum asset vinculado. Clique em 📎 Assets ou arraste um item aqui.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sceneAssets!.map((sceneAsset) => (
            <SceneAssetThumbnail key={sceneAsset.id} sceneAsset={sceneAsset} onDetach={detach} />
          ))}
        </div>
      )}

      <SceneAssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        projectId={projectId}
        sceneId={sceneId}
        linkedAssetIds={linkedAssetIds}
        onAttach={attach}
      />
    </div>
  );
}
