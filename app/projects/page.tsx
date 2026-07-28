"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge, { statusTone } from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { projects } from "@/lib/data";
import { useNewProjectModal } from "@/components/providers/NewProjectModalProvider";

export default function ProjectsPage() {
  const { openNewProjectModal } = useNewProjectModal();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Projetos</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Todos os seus projetos — clique em um cartão para ver os detalhes.
          </p>
        </div>
        <Button variant="primary" onClick={openNewProjectModal}>
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex flex-col overflow-hidden rounded border border-border bg-card transition-all duration-200 ease-az hover:-translate-y-1 hover:border-borderStrong hover:shadow-lg"
          >
            <div
              className="relative flex h-[110px] items-start justify-between p-3"
              style={{ background: `linear-gradient(150deg, ${p.paletteFrom}, ${p.paletteTo})` }}
            >
              <Badge tone={statusTone(p.status)} dot>
                {p.statusLabel}
              </Badge>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="text-[14px] font-bold">{p.name}</div>
              <div className="mt-1 text-[11.5px] text-textTertiary">
                {p.autor} · {p.scenesCount} cenas
              </div>
              <div className="mt-3">
                <ProgressBar value={p.progress} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-textTertiary">
                <span>{p.progress}% concluído</span>
                <span>{p.lastEdited}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
