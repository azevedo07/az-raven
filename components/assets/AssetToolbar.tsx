"use client";

import UploadButton from "./UploadButton";

interface AssetToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onFilesSelected: (files: File[]) => void;
  uploading?: boolean;
}

/** Barra superior da Biblioteca de Assets: busca, alternância grid/lista, botão de envio. Sprint 2.0. */
export default function AssetToolbar({
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
  onFilesSelected,
  uploading,
}: AssetToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textTertiary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Buscar assets por nome…"
          aria-label="Buscar assets"
          className="w-full rounded-sm border border-borderStrong bg-bg2 py-2 pl-9 pr-3 text-[13px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft"
        />
      </div>

      <div className="flex items-center gap-0.5 rounded-sm border border-borderStrong p-0.5" role="group" aria-label="Modo de exibição">
        <ViewModeButton active={viewMode === "grid"} label="Grade" onClick={() => onViewModeChange("grid")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
        </ViewModeButton>
        <ViewModeButton active={viewMode === "list"} label="Lista" onClick={() => onViewModeChange("list")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </ViewModeButton>
      </div>

      <UploadButton onFilesSelected={onFilesSelected} disabled={uploading} />
    </div>
  );
}

function ViewModeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-sm transition-colors duration-150 ease-az",
        active ? "bg-accentSoft text-accent" : "text-textTertiary hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
