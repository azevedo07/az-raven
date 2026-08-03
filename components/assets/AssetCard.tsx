"use client";

import Badge from "../ui/Badge";
import DownloadButton from "./DownloadButton";
import {
  AssetRecord,
  deriveDisplayType,
  displayTypeLabel,
  formatBytes,
  formatDate,
  statusLabel,
  statusTone,
} from "./utils";

function TypeIcon({ asset }: { asset: AssetRecord }) {
  const type = deriveDisplayType(asset);
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;

  if (type === "image") {
    return (
      <svg {...common} className="h-6 w-6 text-accent">
        <circle cx="8.3" cy="9.5" r="1.6" />
        <path d="m4 17 5-5 3.5 3.5L17 10l4 4.5" />
        <rect x="2.5" y="4" width="19" height="16" rx="2" />
      </svg>
    );
  }
  if (type === "video") {
    return (
      <svg {...common} className="h-6 w-6 text-accent">
        <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
        <rect x="8" y="6" width="13" height="12" rx="1.5" />
      </svg>
    );
  }
  if (type === "audio") {
    return (
      <svg {...common} className="h-6 w-6 text-accent">
        <path d="M9 18V6l8-2v12" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="14" cy="16" r="2.5" />
      </svg>
    );
  }
  if (type === "ai-model") {
    return (
      <svg {...common} className="h-6 w-6 text-accent">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </svg>
    );
  }
  // document / other
  return (
    <svg {...common} className="h-6 w-6 text-accent">
      <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M14 2.5V7h4" />
      <path d="M8.5 12.5h7M8.5 15.5h7M8.5 18.5h4" />
    </svg>
  );
}

interface AssetCardProps {
  asset: AssetRecord;
  variant?: "grid" | "list";
  onPreview: (asset: AssetRecord) => void;
  onDeleteRequest: (asset: AssetRecord) => void;
  onCopyName: (asset: AssetRecord) => void;
  onCopyId: (asset: AssetRecord) => void;
  /**
   * Habilita arrastar este card (drag & drop nativo do navegador) — usado
   * pelo `SceneAssetPicker` (Sprint 2.0, `components/sceneAssets/`) para
   * permitir "arrastar da Biblioteca para a cena". `false` por padrão:
   * não muda nada para quem já usa `AssetCard` sem essa opção (`AssetLibrary`).
   */
  draggable?: boolean;
}

/** MIME type customizado usado para carregar o id do Asset arrastado — ver `SceneAssetPicker`. */
export const ASSET_DRAG_MIME_TYPE = "application/x-az-asset-id";

/** Um Asset — em modo grid (card) ou lista (linha). Sprint 2.0. */
export default function AssetCard({
  asset,
  variant = "grid",
  onPreview,
  onDeleteRequest,
  onCopyName,
  onCopyId,
  draggable = false,
}: AssetCardProps) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(ASSET_DRAG_MIME_TYPE, asset.id);
    e.dataTransfer.setData("text/plain", asset.id);
    e.dataTransfer.effectAllowed = "copy";
  }
  const actions = (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <DownloadButton assetId={asset.id} fileName={asset.originalName} />
      <IconButton label="Copiar nome" onClick={() => onCopyName(asset)}>
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="12" height="12" rx="1.5" />
          <path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15" />
        </svg>
      </IconButton>
      <IconButton label="Copiar ID" onClick={() => onCopyId(asset)}>
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="6" rx="1.5" />
          <rect x="3" y="14" width="18" height="6" rx="1.5" />
          <path d="M7 7h.01M7 17h.01" />
        </svg>
      </IconButton>
      <IconButton label="Excluir" tone="danger" onClick={() => onDeleteRequest(asset)}>
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0-.8 12.2A2 2 0 0 1 14.2 21H9.8a2 2 0 0 1-2-1.8L7 7" />
        </svg>
      </IconButton>
    </div>
  );

  if (variant === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
        onClick={() => onPreview(asset)}
        onKeyDown={(e) => e.key === "Enter" && onPreview(asset)}
        className="grid cursor-pointer grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 rounded border border-border bg-card px-3 py-2.5 transition-colors duration-150 ease-az hover:border-borderStrong hover:bg-cardHover sm:grid-cols-[auto_1fr_100px_90px_140px_auto]"
      >
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-border bg-gradient-to-br from-[#1a1e27] to-[#242b1a]">
          <TypeIcon asset={asset} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-white">{asset.name}</div>
          <div className="truncate text-[11px] text-textTertiary">{displayTypeLabel(deriveDisplayType(asset))}</div>
        </div>
        <div className="hidden text-[11px] text-textTertiary sm:block">{formatBytes(asset.size)}</div>
        <div className="hidden sm:block">
          <Badge tone={statusTone(asset.status)}>{statusLabel(asset.status)}</Badge>
        </div>
        <div className="hidden font-mono text-[11px] text-textTertiary sm:block">{formatDate(asset.createdAt)}</div>
        {actions}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onClick={() => onPreview(asset)}
      onKeyDown={(e) => e.key === "Enter" && onPreview(asset)}
      className="group flex cursor-pointer flex-col rounded border border-border bg-card p-3 text-left transition-all duration-200 ease-az hover:-translate-y-0.5 hover:border-borderStrong"
    >
      <div className="mb-2.5 flex h-24 items-center justify-center rounded-md border border-border bg-gradient-to-br from-[#1a1e27] to-[#242b1a]">
        <TypeIcon asset={asset} />
      </div>
      <div className="truncate text-[12.5px] font-medium text-white">{asset.name}</div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-textTertiary">{displayTypeLabel(deriveDisplayType(asset))}</span>
        <span className="text-[11px] text-textTertiary">{formatBytes(asset.size)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge tone={statusTone(asset.status)}>{statusLabel(asset.status)}</Badge>
        {asset.storageProvider && (
          <span className="text-[10px] uppercase tracking-wide text-textTertiary">{asset.storageProvider}</span>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
        <span className="font-mono text-[10.5px] text-textTertiary">{formatDate(asset.createdAt)}</span>
        {actions}
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ease-az",
        tone === "danger" ? "text-textTertiary hover:bg-dangerSoft hover:text-[#f2a19d]" : "text-textTertiary hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
