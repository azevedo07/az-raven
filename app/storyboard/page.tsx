"use client";

import Button from "@/components/ui/Button";
import SceneCard from "@/components/SceneCard";
import { scenes } from "@/lib/data";
import { useCinemaMode } from "@/components/providers/CinemaModeProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function StoryboardPage() {
  const { cinemaMode, toggleCinemaMode } = useCinemaMode();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-borderStrong bg-gradient-to-r from-panel to-[#12161c] px-6 py-5">
        <div className="flex-1 border-r border-border pr-5 last:border-r-0">
          <div className="text-[10px] uppercase tracking-[0.1em] text-textTertiary">Nome</div>
          <div className="mt-1 text-[13px] font-semibold text-white">O Corvo — Edição Cinematográfica</div>
        </div>
        <div className="flex-1 border-r border-border px-5 last:border-r-0">
          <div className="text-[10px] uppercase tracking-[0.1em] text-textTertiary">Autor</div>
          <div className="mt-1 text-[13px] font-semibold text-white">Edgar Allan Poe (adapt. AZ Studio)</div>
        </div>
        <div className="flex-1 border-r border-border px-5 last:border-r-0">
          <div className="text-[10px] uppercase tracking-[0.1em] text-textTertiary">Status geral</div>
          <div className="mt-1 text-[13px] font-semibold text-white">Em andamento · 64%</div>
        </div>
        <div className="flex-[2] pl-5">
          <div className="text-[10px] uppercase tracking-[0.1em] text-textTertiary">Objetivo do projeto</div>
          <div className="mt-1 text-[12.5px] text-textSecondary">
            Traduzir o luto e a loucura crescente do narrador em linguagem puramente visual.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Storyboard</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            6 cenas mapeadas — o coração da produção.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={cinemaMode ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent" : ""}
            onClick={toggleCinemaMode}
          >
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
              <rect x="8" y="6" width="13" height="12" rx="1.5" />
            </svg>
            Modo Cinema
          </Button>
          <Button variant="secondary" size="sm" onClick={() => showToast("Nova cena adicionada ao storyboard")}>
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Cena
          </Button>
        </div>
      </div>

      <div className={["grid grid-cols-1 gap-6", cinemaMode ? "lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"].join(" ")}>
        {scenes.map((s) => (
          <SceneCard key={s.n} scene={s} />
        ))}
      </div>
    </div>
  );
}
