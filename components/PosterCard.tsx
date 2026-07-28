"use client";

import { useRouter } from "next/navigation";
import { Project } from "@/lib/types";
import Badge, { statusTone } from "./ui/Badge";
import ProgressBar from "./ui/ProgressBar";
import { useCinemaMode } from "./providers/CinemaModeProvider";
import { useToast } from "./providers/ToastProvider";

export default function PosterCard({ project }: { project: Project }) {
  const router = useRouter();
  const { setCinemaMode } = useCinemaMode();
  const { showToast } = useToast();

  function open() {
    showToast(`Abrindo "${project.name}"…`);
    setCinemaMode(true);
    router.push("/storyboard");
  }

  return (
    <button
      onClick={open}
      className="group flex flex-col overflow-hidden rounded border border-border bg-card text-left transition-all duration-200 ease-az hover:-translate-y-1 hover:border-borderStrong hover:shadow-lg"
    >
      <div
        className="relative flex h-[150px] items-center justify-center"
        style={{ background: `linear-gradient(150deg, ${project.paletteFrom}, ${project.paletteTo})` }}
      >
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />
        <span className="absolute left-2.5 top-2.5 z-10">
          <Badge tone={statusTone(project.status)} dot>
            {project.statusLabel}
          </Badge>
        </span>
        <span className="z-10 flex h-[42px] w-[42px] scale-90 items-center justify-center rounded-full border border-white/25 bg-bg/55 opacity-0 backdrop-blur-sm transition-all duration-200 ease-az group-hover:scale-100 group-hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="#fff" stroke="none">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <div className="p-3.5">
        <div className="text-[13.5px] font-bold leading-snug text-white">{project.name}</div>
        <div className="mt-1.5 flex justify-between text-[11px] text-textTertiary">
          <span>{project.autor}</span>
          <span>{project.idioma}</span>
        </div>
        <div className="mt-2.5">
          <ProgressBar value={project.progress} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-textTertiary">
          <span>{project.progress}% concluído</span>
          <span>{project.tempo} min</span>
        </div>
      </div>
    </button>
  );
}
