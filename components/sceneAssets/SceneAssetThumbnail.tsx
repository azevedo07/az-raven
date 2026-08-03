"use client";

import { useState } from "react";
import { deriveDisplayType, downloadUrlFor, formatBytes } from "../assets/utils";
import { roleLabel, SceneAssetRecord } from "./utils";

/**
 * Uma miniatura de Asset vinculado a uma cena, com preview rápido no
 * hover (imagem/vídeo/áudio, direto de `GET /api/assets/:id/download` —
 * mesma técnica de `components/assets/AssetPreview.tsx`) e um botão de
 * desvincular. Sprint 2.0.
 */
export default function SceneAssetThumbnail({
  sceneAsset,
  onDetach,
}: {
  sceneAsset: SceneAssetRecord;
  onDetach: (sceneAsset: SceneAssetRecord) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const displayType = deriveDisplayType(sceneAsset.asset);
  const url = downloadUrlFor(sceneAsset.assetId);

  return (
    <div
      className="group/thumb relative h-14 w-14 flex-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-border bg-[#0b0e13] text-[9px] uppercase text-textTertiary">
        {displayType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={sceneAsset.asset.name} className="h-full w-full object-cover" />
        ) : (
          <TypeGlyph type={displayType} />
        )}
      </div>

      <button
        type="button"
        aria-label={`Desvincular ${sceneAsset.asset.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onDetach(sceneAsset);
        }}
        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-borderStrong bg-panel text-textTertiary opacity-0 transition-opacity duration-150 ease-az hover:bg-dangerSoft hover:text-[#f2a19d] group-hover/thumb:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {hovering && (
        <div
          data-testid="scene-asset-hover-preview"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-md border border-borderStrong bg-panel p-2 shadow-lg"
        >
          <div className="mb-1.5 flex h-24 items-center justify-center overflow-hidden rounded border border-border bg-[#0b0e13]">
            {displayType === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={sceneAsset.asset.name} className="h-full w-full object-cover" />
            )}
            {displayType === "video" && <video src={url} muted className="h-full w-full object-cover" />}
            {displayType === "audio" && <audio src={url} controls className="w-full px-1" />}
            {(displayType === "document" || displayType === "ai-model" || displayType === "other") && (
              <TypeGlyph type={displayType} large />
            )}
          </div>
          <div className="truncate text-[11px] font-medium text-white">{sceneAsset.asset.name}</div>
          <div className="flex items-center justify-between text-[10px] text-textTertiary">
            <span>{roleLabel(sceneAsset.role)}</span>
            <span>{formatBytes(sceneAsset.asset.size)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeGlyph({ type, large = false }: { type: string; large?: boolean }) {
  const size = large ? "h-8 w-8" : "h-5 w-5";
  const label = type === "video" ? "VÍDEO" : type === "audio" ? "ÁUDIO" : type === "ai-model" ? "IA" : type === "document" ? "DOC" : "?";
  return (
    <div className="flex flex-col items-center gap-1 text-accent">
      <svg viewBox="0 0 24 24" className={size} fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
      {large && <span className="text-[9px] text-textTertiary">{label}</span>}
    </div>
  );
}
