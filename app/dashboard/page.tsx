"use client";

import { useRouter } from "next/navigation";
import RavenMark from "@/components/RavenMark";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import PosterCard from "@/components/PosterCard";
import { projects, getProjectById } from "@/lib/data";
import { useCinemaMode } from "@/components/providers/CinemaModeProvider";
import { useNewProjectModal } from "@/components/providers/NewProjectModalProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { setCinemaMode } = useCinemaMode();
  const { openNewProjectModal } = useNewProjectModal();
  const featured = getProjectById("o-corvo")!;

  function continueProduction() {
    setCinemaMode(true);
    router.push("/storyboard");
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="relative overflow-hidden rounded-lg border border-borderStrong bg-gradient-to-br from-[#12151b] via-[#0c0e12] to-[#0a0b0e] px-11 py-14">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-[340px] w-[340px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.10), transparent 70%)" }}
        />
        <span className="mb-3.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textTertiary">
          <span className="h-px w-[22px] bg-accent" /> AZ Studio · Produção Cinematográfica com IA
        </span>
        <div className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[13px] border border-accentSoftStrong bg-gradient-to-br from-[#1c2230] to-[#11141a]">
          <RavenMark className="h-[27px] w-[27px]" />
        </div>
        <h1 className="max-w-xl text-[34px] font-extrabold leading-tight tracking-tight">
          AZ Raven
          <br />
          <span className="text-accent">&quot;Toda arte em busca da perfeição.&quot;</span>
        </h1>
        <p className="mt-3.5 max-w-lg text-[15px] leading-relaxed text-textSecondary">
          Transformando literatura em experiências cinematográficas com inteligência artificial.
          Do texto à tela — direção literária, storyboard e linguagem cinematográfica em um único
          estúdio.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button variant="primary" onClick={openNewProjectModal}>
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Projeto
          </Button>
          <Button variant="secondary" onClick={continueProduction}>
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
              <rect x="8" y="6" width="13" height="12" rx="1.5" />
            </svg>
            Continuar Projeto
          </Button>
        </div>
      </section>

      <div>
        <h2 className="mb-4 text-base font-semibold">Continue de onde parou</h2>
        <button
          onClick={continueProduction}
          className="flex w-full gap-6 rounded-lg border border-borderStrong bg-gradient-to-r from-card to-panel p-5 text-left transition-all duration-200 ease-az hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)]"
        >
          <div className="relative flex h-[130px] w-[190px] flex-none items-center justify-center overflow-hidden rounded border border-border bg-gradient-to-br from-[#0B0D10] via-[#3a2a12] to-[#1a1420]">
            <span className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
            <span className="z-10 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent shadow-[0_8px_22px_rgba(212,175,55,0.35)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#0B0D10" stroke="none">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <Badge tone="gold">Em andamento</Badge>
            <div className="mt-2.5 text-[19px] font-bold">{featured.name}</div>
            <div className="mt-1 text-[12.5px] text-textSecondary">
              {featured.autor} · {featured.idioma === "PT-BR" ? "Português (Brasil)" : featured.idioma}
            </div>
            <div className="mt-4 max-w-[420px]">
              <ProgressBar value={featured.progress} />
            </div>
            <div className="mt-2 flex max-w-[420px] justify-between text-[11px] text-textTertiary">
              <span>{featured.progress}% concluído</span>
              <span>Última alteração: há 12 minutos</span>
            </div>
          </div>
        </button>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Projetos recentes</h2>
          <button onClick={() => router.push("/library")} className="text-xs font-semibold text-textSecondary hover:text-white">
            Ver biblioteca completa →
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projects.slice(0, 4).map((p) => (
            <PosterCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
