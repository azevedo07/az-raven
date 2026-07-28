"use client";

import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge, { statusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { getProjectById } from "@/lib/data";
import { useCinemaMode } from "@/components/providers/CinemaModeProvider";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = getProjectById(params.id);
  const router = useRouter();
  const { setCinemaMode } = useCinemaMode();

  if (!project) {
    notFound();
  }

  function openInCinema() {
    setCinemaMode(true);
    router.push("/storyboard");
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/projects" className="w-fit text-xs font-semibold text-textSecondary hover:text-white">
        ← Voltar para Projetos
      </Link>

      <div
        className="relative flex h-[220px] items-end overflow-hidden rounded-lg border border-borderStrong p-6"
        style={{ background: `linear-gradient(150deg, ${project.paletteFrom}, ${project.paletteTo})` }}
      >
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="z-10">
          <Badge tone={statusTone(project.status)} dot>
            {project.statusLabel}
          </Badge>
          <h1 className="mt-3 text-[28px] font-extrabold text-white">{project.name}</h1>
          <p className="mt-1 text-[13px] text-white/80">
            {project.autor} · {project.idioma === "PT-BR" ? "Português (Brasil)" : project.idioma}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card flat>
          <div className="text-[11px] uppercase tracking-[0.1em] text-textTertiary">Progresso</div>
          <div className="mt-2">
            <ProgressBar value={project.progress} />
          </div>
          <div className="mt-1.5 text-[12.5px] text-textSecondary">{project.progress}% concluído</div>
        </Card>
        <Card flat>
          <div className="text-[11px] uppercase tracking-[0.1em] text-textTertiary">Cenas</div>
          <div className="mt-2 text-[22px] font-bold">{project.scenesCount}</div>
        </Card>
        <Card flat>
          <div className="text-[11px] uppercase tracking-[0.1em] text-textTertiary">Última alteração</div>
          <div className="mt-2 text-[13.5px] font-semibold text-white">{project.lastEdited}</div>
        </Card>
      </div>

      <Card>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Objetivo do projeto
        </div>
        <p className="text-[13.5px] leading-relaxed text-textSecondary">{project.objective}</p>
      </Card>

      <div className="flex gap-3">
        <Button variant="primary" onClick={openInCinema}>
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
            <rect x="8" y="6" width="13" height="12" rx="1.5" />
          </svg>
          Continuar Produção
        </Button>
        <Link href="/production">
          <Button variant="secondary">Ver Pipeline</Button>
        </Link>
      </div>
    </div>
  );
}
