"use client";

import { useState } from "react";
import DownloadButton from "../assets/DownloadButton";
import { deriveDisplayType, displayTypeLabel, downloadUrlFor, formatBytes, formatDate } from "../assets/utils";
import { roleLabel, SCENE_ASSET_ROLES, SceneAssetRecord } from "./utils";

/**
 * Card de um Asset vinculado a uma cena — nome, tipo, papel (editável),
 * ordem, tamanho e data sempre visíveis, com preview de
 * imagem/vídeo/áudio (direto de `GET /api/assets/:id/download` — mesma
 * técnica de `components/assets/AssetPreview.tsx`) acionável por hover
 * OU pelo botão "Preview" (hover sozinho não é acessível por teclado).
 * `DownloadButton` é reaproveitado de `components/assets/` sem
 * modificação — não duplica a rota de download nem o Storage.
 *
 * Sprint 2.0 introduziu a versão compacta (só miniatura + selo de
 * ordem); a Task "Scene Asset Binding — Storyboard Integration" expandiu
 * para o card com nome/tipo/papel/ordem sempre visíveis; a Task "Scene
 * Asset Workspace" acrescentou tamanho/data/Preview explícito/Download e
 * um indicador visível de "Atualizando…" durante mutações (antes só
 * desabilitava os controles, sem feedback textual) — mesmo componente,
 * evoluído a cada Task, nunca duplicado.
 *
 * Todas as mutações (`onRoleChange`/`onMoveUp`/`onMoveDown`/
 * `onDetachRequest`) são delegadas ao pai (`SceneAssetsPanel`) — este
 * componente não fala com `fetch`/HTTP diretamente.
 */
export default function SceneAssetThumbnail({
  sceneAsset,
  busy = false,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRoleChange,
  onDetachRequest,
}: {
  sceneAsset: SceneAssetRecord;
  /** true enquanto qualquer mutação deste vínculo está em andamento — desabilita todos os controles (evita duplo clique) e mostra "Atualizando…". */
  busy?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: (sceneAsset: SceneAssetRecord) => void;
  onMoveDown: (sceneAsset: SceneAssetRecord) => void;
  onRoleChange: (sceneAsset: SceneAssetRecord, role: string) => void;
  onDetachRequest: (sceneAsset: SceneAssetRecord) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const displayType = deriveDisplayType(sceneAsset.asset);
  const url = downloadUrlFor(sceneAsset.assetId);
  const knownRole = (SCENE_ASSET_ROLES as readonly string[]).includes(sceneAsset.role);
  const showPreview = hovering || previewOpen;

  return (
    <div
      data-testid="scene-asset-card"
      className="group/thumb relative flex w-[168px] flex-none flex-col gap-1.5 rounded-md border border-border bg-card p-2"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {busy && (
        <div
          data-testid="scene-asset-card-busy"
          className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-black/60 text-[10px] text-white"
        >
          Atualizando…
        </div>
      )}

      <div className="relative h-20 w-full overflow-hidden rounded border border-border bg-[#0b0e13] text-[9px] uppercase text-textTertiary">
        {displayType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={sceneAsset.asset.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TypeGlyph type={displayType} />
          </div>
        )}
        <span
          data-testid="scene-asset-order-badge"
          className="absolute bottom-1 left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-borderStrong bg-panel px-1 font-mono text-[9px] text-textTertiary"
        >
          {sceneAsset.order + 1}
        </span>
      </div>

      <div className="truncate text-[11.5px] font-medium text-white" title={sceneAsset.asset.name}>
        {sceneAsset.asset.name}
      </div>
      <div className="flex items-center justify-between text-[10px] text-textTertiary">
        <span>{displayTypeLabel(displayType)}</span>
        <span>{formatBytes(sceneAsset.asset.size)}</span>
      </div>
      <div className="text-[9.5px] text-textTertiary">{formatDate(sceneAsset.createdAt)}</div>

      <label className="flex flex-col gap-0.5">
        <span className="text-[9px] uppercase tracking-wide text-textTertiary">Papel na cena</span>
        <select
          aria-label={`Papel de ${sceneAsset.asset.name} na cena`}
          value={sceneAsset.role}
          disabled={busy}
          onChange={(e) => onRoleChange(sceneAsset, e.target.value)}
          className="w-full rounded-sm border border-borderStrong bg-bg2 px-1.5 py-1 text-[11px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft disabled:opacity-50"
        >
          {!knownRole && <option value={sceneAsset.role}>{roleLabel(sceneAsset.role)}</option>}
          {SCENE_ASSET_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-0.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Mover ${sceneAsset.asset.name} para cima`}
            disabled={busy || !canMoveUp}
            onClick={() => onMoveUp(sceneAsset)}
            className="flex h-6 w-6 items-center justify-center rounded-sm border border-borderStrong text-textSecondary transition-colors duration-150 ease-az hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Mover ${sceneAsset.asset.name} para baixo`}
            disabled={busy || !canMoveDown}
            onClick={() => onMoveDown(sceneAsset)}
            className="flex h-6 w-6 items-center justify-center rounded-sm border border-borderStrong text-textSecondary transition-colors duration-150 ease-az hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={`Pré-visualizar ${sceneAsset.asset.name}`}
            aria-pressed={previewOpen}
            disabled={busy}
            onClick={() => setPreviewOpen((prev) => !prev)}
            className="flex h-6 w-6 items-center justify-center rounded-sm border border-borderStrong text-textSecondary transition-colors duration-150 ease-az hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
          <DownloadButton assetId={sceneAsset.assetId} fileName={sceneAsset.asset.name} label={`Baixar ${sceneAsset.asset.name}`} />
        </div>
        <button
          type="button"
          aria-label={`Remover vínculo de ${sceneAsset.asset.name}`}
          disabled={busy}
          onClick={() => onDetachRequest(sceneAsset)}
          className="rounded-sm border border-borderStrong px-2 py-1 text-[10px] text-textSecondary transition-colors duration-150 ease-az hover:bg-dangerSoft hover:text-[#f2a19d] disabled:opacity-40"
        >
          Remover
        </button>
      </div>

      {showPreview && (
        <div
          data-testid="scene-asset-hover-preview"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-md border border-borderStrong bg-panel p-2 shadow-lg"
        >
          <div className="mb-1.5 flex h-24 items-center justify-center overflow-hidden rounded border border-border bg-[#0b0e13]">
            {displayType === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={sceneAsset.asset.name} className="h-full w-full object-cover" />
            )}
            {displayType === "video" && <video src={url} muted controls className="h-full w-full object-cover" />}
            {displayType === "audio" && <audio src={url} controls className="w-full px-1" />}
            {(displayType === "document" || displayType === "ai-model" || displayType === "other") && (
              <TypeGlyph type={displayType} large />
            )}
          </div>
          <div className="truncate text-[11px] font-medium text-white">{sceneAsset.asset.name}</div>
          <div className="flex items-center justify-between text-[10px] text-textTertiary">
            <span>{roleLabel(sceneAsset.role)}</span>
            <span>#{sceneAsset.order + 1}</span>
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
