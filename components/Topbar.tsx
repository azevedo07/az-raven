"use client";

import { usePathname } from "next/navigation";
import { useCinemaMode } from "./providers/CinemaModeProvider";
import { useToast } from "./providers/ToastProvider";

const titles: Record<string, { title: string; eyebrow: string }> = {
  "/dashboard": { title: "Dashboard", eyebrow: "AZ Raven" },
  "/projects": { title: "Projetos", eyebrow: "Seus projetos" },
  "/library": { title: "Biblioteca", eyebrow: "Catálogo de produções" },
  "/literary-director": { title: "Literary Director", eyebrow: "Análise Narrativa" },
  "/emotion-engine": { title: "Emotion Engine", eyebrow: "Arco Emocional" },
  "/character-engine": { title: "Character Engine", eyebrow: "Ficha de Personagens" },
  "/world-builder": { title: "World Builder", eyebrow: "World Bible" },
  "/storyboard": { title: "Storyboard", eyebrow: "Cenas & Sequência" },
  "/director": { title: "Director Engine", eyebrow: "Linguagem Cinematográfica" },
  "/prompt-builder": { title: "Prompt Builder", eyebrow: "Geração de Prompts" },
  "/production": { title: "Produção", eyebrow: "Pipeline cinematográfico" },
  "/timeline": { title: "Timeline", eyebrow: "Edição cinematográfica" },
  "/assets": { title: "Assets", eyebrow: "Biblioteca visual" },
  "/quality-director": { title: "AZ Quality Director", eyebrow: "Auditoria cinematográfica" },
  "/audience-intelligence": { title: "Audience Intelligence", eyebrow: "Preparação para publicação" },
  "/export": { title: "Exportação", eyebrow: "Entrega final" },
  "/settings": { title: "Configurações", eyebrow: "Preferências" },
};

export default function Topbar() {
  const pathname = usePathname();
  const { cinemaMode, toggleCinemaMode, toggleSidebar } = useCinemaMode();
  const { showToast } = useToast();
  const current =
    titles[pathname] ??
    (pathname.startsWith("/projects/")
      ? { title: "Detalhes do Projeto", eyebrow: "Projetos" }
      : { title: "", eyebrow: "" });

  return (
    <header className="sticky top-0 z-30 flex h-[66px] flex-none items-center gap-4 border-b border-border bg-bg/75 px-6 backdrop-blur-md">
      <button
        onClick={toggleSidebar}
        aria-label="Recolher menu"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-textSecondary transition-colors hover:bg-card hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <line x1="9.5" y1="4" x2="9.5" y2="20" />
        </svg>
      </button>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10.5px] uppercase tracking-[0.1em] text-textTertiary">{current.eyebrow}</span>
        <span className="text-base font-semibold text-white">{current.title}</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={toggleCinemaMode}
        className={[
          "flex items-center gap-2 rounded-sm border px-3 py-2 text-xs font-semibold transition-colors",
          cinemaMode
            ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
            : "border-borderStrong bg-card text-white hover:bg-cardHover",
        ].join(" ")}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
          <rect x="8" y="6" width="13" height="12" rx="1.5" />
        </svg>
        Modo Cinema
      </button>

      <div className="hidden w-[260px] items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 sm:flex">
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] flex-none text-textTertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Pesquisar projetos, cenas, assets…"
          className="w-full bg-transparent text-[13px] text-white placeholder:text-textTertiary focus:outline-none"
        />
      </div>

      <button
        onClick={() => showToast("Você está em dia — nenhuma notificação nova")}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-textSecondary hover:bg-cardHover hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-[16.5px] w-[16.5px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14 18 8Z" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        <span className="absolute right-[7px] top-[7px] h-[9px] w-[9px] rounded-full border-2 border-bg bg-accent" />
      </button>

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#8a6f22] text-[13px] font-bold text-[#181008]">
        CM
      </div>
    </header>
  );
}
