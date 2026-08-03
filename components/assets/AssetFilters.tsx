"use client";

import { DisplayAssetType, displayTypeLabel } from "./utils";

export type TypeFilter = DisplayAssetType | "all";
export type SortOption = "newest" | "oldest" | "name" | "size";

const TYPE_FILTERS: TypeFilter[] = ["all", "image", "video", "audio", "document", "ai-model"];

const SORT_LABEL: Record<SortOption, string> = {
  newest: "Mais recentes",
  oldest: "Mais antigos",
  name: "Nome",
  size: "Tamanho",
};

interface AssetFiltersProps {
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
}

/** Filtro por categoria + ordenação da Biblioteca de Assets — Sprint 2.0. */
export default function AssetFilters({ typeFilter, onTypeFilterChange, sortBy, onSortByChange }: AssetFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        {TYPE_FILTERS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeFilterChange(type)}
            aria-pressed={typeFilter === type}
            className={[
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              typeFilter === type
                ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
                : "border-borderStrong text-textSecondary hover:bg-accentSoft hover:text-accent",
            ].join(" ")}
          >
            {type === "all" ? "Todos" : displayTypeLabel(type)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs text-textSecondary">
        Ordenar por
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortOption)}
          className="rounded-sm border border-borderStrong bg-bg2 px-2.5 py-1.5 text-xs text-white outline-none focus:border-accent"
        >
          {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
            <option key={option} value={option}>
              {SORT_LABEL[option]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
