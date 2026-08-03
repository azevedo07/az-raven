"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import { ASSET_DRAG_MIME_TYPE } from "../assets/AssetCard";
import { AssetRecord, deriveDisplayType, displayTypeLabel, formatBytes } from "../assets/utils";
import {
  defaultRoleForDisplayType,
  matchesPickerFilter,
  PickerTypeFilter,
  pickerFilterLabel,
  SCENE_ASSET_ROLES,
  roleLabel,
} from "./utils";

const FILTERS: PickerTypeFilter[] = ["all", "image", "video", "audio", "prompt", "ai-model"];

interface SceneAssetPickerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sceneId: string;
  /** ids já vinculados a esta cena — mostra um selo "Vinculado", não impede reforçar com outro papel. */
  linkedAssetIds: string[];
  onAttach: (assetId: string, role: string) => Promise<void>;
}

/**
 * Modal para escolher um Asset já existente da Biblioteca e vinculá-lo a
 * uma cena (Sprint 2.0). Consome exclusivamente `GET /api/assets` — nunca
 * Service/Repository/Storage diretamente. Suporta clicar num asset OU
 * arrastá-lo até a zona de soltar no topo — as duas ações vinculam com o
 * mesmo papel padrão (ver `defaultRoleForDisplayType`), ajustável depois.
 */
export default function SceneAssetPicker({
  open,
  onClose,
  projectId,
  sceneId,
  linkedAssetIds,
  onAttach,
}: SceneAssetPickerProps) {
  const [assets, setAssets] = useState<AssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PickerTypeFilter>("all");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAssets(null);
    setError(null);

    fetch(`/api/assets?projectId=${encodeURIComponent(projectId)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os assets.");
        return response.json();
      })
      .then((data: AssetRecord[]) => {
        if (!cancelled) setAssets(data.filter((a) => a.status !== "DELETED"));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido.");
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const visibleAssets = useMemo(() => {
    if (!assets) return null;
    let result = assets.filter((asset) => matchesPickerFilter(asset, filter));
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((asset) => asset.name.toLowerCase().includes(query));
    }
    return result;
  }, [assets, filter, search]);

  async function handleAttach(asset: AssetRecord) {
    setAttachingId(asset.id);
    setAttachError(null);
    try {
      await onAttach(asset.id, defaultRoleForDisplayType(deriveDisplayType(asset)));
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setAttachingId(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    const assetId = e.dataTransfer.getData(ASSET_DRAG_MIME_TYPE) || e.dataTransfer.getData("text/plain");
    const asset = assets?.find((a) => a.id === assetId);
    if (asset) handleAttach(asset);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Vincular Asset — Cena ${sceneId}`}>
      <div className="flex flex-col gap-3">
        <div
          data-testid="scene-asset-picker-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={[
            "rounded-md border-2 border-dashed p-3 text-center text-[12px] transition-colors",
            isDraggingOver ? "border-accent bg-accentSoft text-accent" : "border-border text-textTertiary",
          ].join(" ")}
        >
          Arraste um asset até aqui, ou clique num item abaixo, para vincular à cena.
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar assets…"
          aria-label="Buscar assets para vincular"
          className="w-full rounded-sm border border-borderStrong bg-bg2 px-3 py-2 text-[13px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft"
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={[
                "rounded-full border px-3 py-1 text-[11px] transition-colors",
                filter === f
                  ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
                  : "border-borderStrong text-textSecondary hover:bg-accentSoft hover:text-accent",
              ].join(" ")}
            >
              {pickerFilterLabel(f)}
            </button>
          ))}
        </div>

        {error && <div className="text-[12px] text-danger">{error}</div>}
        {attachError && <div className="text-[12px] text-danger">{attachError}</div>}

        <div className="grid max-h-[360px] grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4">
          {visibleAssets === null && !error && (
            <p className="col-span-full py-6 text-center text-[12px] text-textTertiary">Carregando…</p>
          )}
          {visibleAssets?.length === 0 && (
            <p className="col-span-full py-6 text-center text-[12px] text-textTertiary">Nenhum asset encontrado.</p>
          )}
          {visibleAssets?.map((asset) => (
            <PickerAssetTile
              key={asset.id}
              asset={asset}
              alreadyLinked={linkedAssetIds.includes(asset.id)}
              attaching={attachingId === asset.id}
              onClick={() => handleAttach(asset)}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Item do picker — deliberadamente não é `AssetCard` (que mostra
 * baixar/excluir/copiar, irrelevantes aqui): só o suficiente para
 * escolher (miniatura, nome, tipo, tamanho), arrastável.
 */
function PickerAssetTile({
  asset,
  alreadyLinked,
  attaching,
  onClick,
}: {
  asset: AssetRecord;
  alreadyLinked: boolean;
  attaching: boolean;
  onClick: () => void;
}) {
  const displayType = deriveDisplayType(asset);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(ASSET_DRAG_MIME_TYPE, asset.id);
    e.dataTransfer.setData("text/plain", asset.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      disabled={attaching}
      className="relative flex flex-col rounded border border-border bg-card p-2 text-left transition-colors duration-150 ease-az hover:border-borderStrong hover:bg-cardHover disabled:opacity-60"
    >
      {alreadyLinked && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-successSoft px-1.5 py-0.5 text-[9px] font-semibold text-success">
          Vinculado
        </span>
      )}
      {attaching && (
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded bg-black/60 text-[10px] text-white">
          Vinculando…
        </span>
      )}
      <div className="mb-1.5 flex h-14 items-center justify-center overflow-hidden rounded border border-border bg-[#0b0e13]">
        {displayType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/assets/${asset.id}/download`} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[9px] uppercase text-textTertiary">{asset.extension || "?"}</span>
        )}
      </div>
      <div className="truncate text-[11px] font-medium text-white">{asset.name}</div>
      <div className="flex items-center justify-between text-[10px] text-textTertiary">
        <span>{displayTypeLabel(displayType)}</span>
        <span>{formatBytes(asset.size)}</span>
      </div>
    </button>
  );
}

/** Exportado só para reaproveitamento de testes/labels externos, se necessário. */
export const ALL_SCENE_ASSET_ROLES = SCENE_ASSET_ROLES;
export { roleLabel };
