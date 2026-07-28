"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import PosterCard from "@/components/PosterCard";
import { projects } from "@/lib/data";
import { ProjectStatus } from "@/lib/types";
import { useNewProjectModal } from "@/components/providers/NewProjectModalProvider";

const filters: { key: ProjectStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todas" },
  { key: "andamento", label: "Em produção" },
  { key: "revisao", label: "Em revisão" },
  { key: "concluido", label: "Concluídas" },
];

export default function BibliotecaPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "todos">("todos");
  const { openNewProjectModal } = useNewProjectModal();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(q) ||
        p.autor.toLowerCase().includes(q) ||
        p.idioma.toLowerCase().includes(q);
      const matchesFilter = activeFilter === "todos" || p.status === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [query, activeFilter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Biblioteca</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">O catálogo completo das produções do estúdio AZ.</p>
        </div>
        <Button variant="primary" onClick={openNewProjectModal}>
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Projeto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-[320px] items-center gap-2 rounded-sm border border-border bg-card px-3 py-2">
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] flex-none text-textTertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por título, autor ou idioma…"
            className="w-full bg-transparent text-[13px] text-white placeholder:text-textTertiary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                activeFilter === f.key
                  ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
                  : "border-borderStrong text-textSecondary hover:bg-accentSoft hover:text-accent",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <PosterCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="rounded border border-border bg-card p-10 text-center">
          <div className="font-semibold">Nenhuma produção encontrada</div>
          <div className="mt-1.5 text-xs text-textTertiary">Ajuste sua pesquisa ou os filtros aplicados.</div>
        </div>
      )}
    </div>
  );
}
