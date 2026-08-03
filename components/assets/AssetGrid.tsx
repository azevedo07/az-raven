"use client";

import AssetCard from "./AssetCard";
import { AssetRecord } from "./utils";

interface AssetGridProps {
  /** `null` = carregando (mostra skeleton). `[]` = carregado, vazio (mostra estado vazio). */
  assets: AssetRecord[] | null;
  viewMode: "grid" | "list";
  onPreview: (asset: AssetRecord) => void;
  onDeleteRequest: (asset: AssetRecord) => void;
  onCopyName: (asset: AssetRecord) => void;
  onCopyId: (asset: AssetRecord) => void;
  emptyMessage?: string;
}

/** Grade (ou lista) de Assets — Sprint 2.0. Também é dono dos estados de loading (skeleton) e vazio. */
export default function AssetGrid({
  assets,
  viewMode,
  onPreview,
  onDeleteRequest,
  onCopyName,
  onCopyId,
  emptyMessage = "Nenhum asset encontrado.",
}: AssetGridProps) {
  if (assets === null) {
    return <SkeletonGrid viewMode={viewMode} />;
  }

  if (assets.length === 0) {
    return (
      <div
        data-testid="asset-grid-empty"
        className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-border py-16 text-center"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-textTertiary" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2.5" y="4" width="19" height="16" rx="2" />
          <path d="m4 17 5-5 3.5 3.5L17 10l4 4.5" />
          <circle cx="8.3" cy="9.5" r="1.6" />
        </svg>
        <p className="text-[13px] text-textSecondary">{emptyMessage}</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div data-testid="asset-grid" className="flex flex-col gap-1.5">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            variant="list"
            onPreview={onPreview}
            onDeleteRequest={onDeleteRequest}
            onCopyName={onCopyName}
            onCopyId={onCopyId}
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="asset-grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          variant="grid"
          onPreview={onPreview}
          onDeleteRequest={onDeleteRequest}
          onCopyName={onCopyName}
          onCopyId={onCopyId}
        />
      ))}
    </div>
  );
}

function SkeletonGrid({ viewMode }: { viewMode: "grid" | "list" }) {
  const items = Array.from({ length: viewMode === "grid" ? 10 : 6 });

  if (viewMode === "list") {
    return (
      <div data-testid="asset-grid-skeleton" className="flex flex-col gap-1.5">
        {items.map((_, i) => (
          <div key={i} className="h-[52px] animate-pulse rounded border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="asset-grid-skeleton" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((_, i) => (
        <div key={i} className="h-[168px] animate-pulse rounded border border-border bg-card" />
      ))}
    </div>
  );
}
