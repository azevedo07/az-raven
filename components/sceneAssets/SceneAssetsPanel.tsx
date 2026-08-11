"use client";

import { useCallback, useEffect, useState } from "react";
import { ASSET_DRAG_MIME_TYPE } from "../assets/AssetCard";
import { deriveDisplayType } from "../assets/utils";
import { useToast } from "../providers/ToastProvider";
import DetachSceneAssetDialog from "./DetachSceneAssetDialog";
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
 * Binding"; reordenar, trocar papel e confirmação de remoção
 * adicionados na Task "Scene Asset Binding — Storyboard Integration").
 * Só fala com essas rotas HTTP — nunca com Service/Repository/Storage
 * diretamente. Aceita dois caminhos para vincular um Asset: abrir
 * `SceneAssetPicker` (clique) ou soltar um card arrastado da Biblioteca
 * direto sobre o painel.
 */
export default function SceneAssetsPanel({ sceneId, projectId }: SceneAssetsPanelProps) {
  const { showToast } = useToast();
  const [sceneAssets, setSceneAssets] = useState<SceneAssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [pendingDetach, setPendingDetach] = useState<SceneAssetRecord | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch(`/api/scenes/${encodeURIComponent(sceneId)}/assets`)
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os assets da cena.");
        return response.json();
      })
      .then((data: SceneAssetRecord[]) => {
        setSceneAssets(data);
        setError(null);
      })
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

  const patchSceneAsset = useCallback(
    async (sceneAssetId: string, patch: Record<string, unknown>) => {
      const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/assets/${sceneAssetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Não foi possível atualizar o vínculo.");
      }
    },
    [sceneId]
  );

  function withBusy(items: SceneAssetRecord[], fn: () => Promise<void>) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.id);
      return next;
    });
    return fn().finally(() => {
      setBusyIds((prev) => {
        const next = new Set(prev);
        for (const item of items) next.delete(item.id);
        return next;
      });
    });
  }

  async function handleRoleChange(sceneAsset: SceneAssetRecord, role: string) {
    if (role === sceneAsset.role) return;
    await withBusy([sceneAsset], async () => {
      try {
        await patchSceneAsset(sceneAsset.id, { role });
        load();
        showToast(`Papel de "${sceneAsset.asset.name}" atualizado.`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Não foi possível atualizar o papel.");
      }
    });
  }

  async function handleMove(sceneAsset: SceneAssetRecord, direction: "up" | "down") {
    if (!sceneAssets) return;
    const index = sceneAssets.findIndex((sa) => sa.id === sceneAsset.id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || neighborIndex < 0 || neighborIndex >= sceneAssets.length) return;
    const neighbor = sceneAssets[neighborIndex];

    await withBusy([sceneAsset, neighbor], async () => {
      try {
        await Promise.all([
          patchSceneAsset(sceneAsset.id, { order: neighbor.order }),
          patchSceneAsset(neighbor.id, { order: sceneAsset.order }),
        ]);
        load();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Não foi possível reordenar.");
        load();
      }
    });
  }

  async function handleDetachConfirm(sceneAsset: SceneAssetRecord) {
    setSceneAssets((prev) => prev?.filter((sa) => sa.id !== sceneAsset.id) ?? prev);
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/assets/${sceneAsset.id}`, {
      method: "DELETE",
    });
    if (!response.ok && response.status !== 404) {
      load();
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message ?? "Não foi possível remover o vínculo.");
    }
    setPendingDetach(null);
    showToast(`Vínculo com "${sceneAsset.asset.name}" removido.`);
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
        <span className="text-[11.5px] font-medium text-textSecondary">Assets da cena</span>
        <span data-testid="scene-asset-counter" className="text-[10.5px] text-textTertiary">
          Cena {sceneId} · {count} {count === 1 ? "Asset" : "Assets"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mb-2 flex items-center gap-1.5 rounded-sm border border-borderStrong px-2.5 py-1.5 text-[11px] font-medium text-textSecondary transition-colors duration-150 ease-az hover:bg-white/[0.06] hover:text-white"
      >
        <span aria-hidden>+</span> Adicionar Asset
      </button>

      {error && (
        <p className="mb-2 text-[11px] text-danger">
          {error}{" "}
          <button type="button" onClick={load} className="underline hover:text-white">
            Tentar novamente
          </button>
        </p>
      )}
      {dropError && <p className="mb-2 text-[11px] text-danger">{dropError}</p>}

      {sceneAssets === null && !error ? (
        <p data-testid="scene-assets-loading" className="text-[11px] text-textTertiary">
          Carregando…
        </p>
      ) : count === 0 ? (
        <div data-testid="scene-assets-empty" className="flex flex-col gap-1 text-[11px] text-textTertiary">
          <p className="text-white">Esta cena ainda não possui Assets.</p>
          <p>Adicione referências visuais, personagens, ambientes ou objetos para começar.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sceneAssets!.map((sceneAsset, index) => (
            <SceneAssetThumbnail
              key={sceneAsset.id}
              sceneAsset={sceneAsset}
              busy={busyIds.has(sceneAsset.id)}
              canMoveUp={index > 0}
              canMoveDown={index < sceneAssets!.length - 1}
              onMoveUp={(sa) => handleMove(sa, "up")}
              onMoveDown={(sa) => handleMove(sa, "down")}
              onRoleChange={handleRoleChange}
              onDetachRequest={setPendingDetach}
            />
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

      <DetachSceneAssetDialog
        sceneAsset={pendingDetach}
        onClose={() => setPendingDetach(null)}
        onConfirm={handleDetachConfirm}
      />
    </div>
  );
}
