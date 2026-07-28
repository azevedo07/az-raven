"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";

const assetTypes = [
  { type: "image", label: "Cena 01 — still" },
  { type: "video", label: "Cena 03 — clipe" },
  { type: "audio", label: "Ambiente — vento" },
  { type: "image", label: "Referência de luz" },
  { type: "audio", label: "Trilha — piano" },
  { type: "video", label: "Cena 06 — clipe" },
  { type: "image", label: "Busto de Palas — teste" },
  { type: "audio", label: "Narração — take 3" },
];

const categories = ["Todos", "Imagens", "Vídeos", "Áudios"] as const;
const typeMap: Record<string, string> = { Imagens: "image", Vídeos: "video", Áudios: "audio" };

export default function AssetsPage() {
  const [active, setActive] = useState<(typeof categories)[number]>("Todos");
  const { showToast } = useToast();

  const filtered = assetTypes.filter((a) => active === "Todos" || a.type === typeMap[active]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Assets</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">Biblioteca visual, sonora e audiovisual do projeto.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => showToast("Selecione um arquivo para enviar")}>
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Enviar Asset
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              active === c
                ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
                : "border-borderStrong text-textSecondary hover:bg-accentSoft hover:text-accent",
            ].join(" ")}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((a, i) => (
          <button
            key={i}
            onClick={() => showToast(`Visualizando ${a.label}…`)}
            className="rounded border border-border bg-card p-3 text-left transition-all duration-200 ease-az hover:-translate-y-0.5 hover:border-borderStrong"
          >
            <div className="mb-2.5 flex h-24 items-center justify-center rounded-md border border-border bg-gradient-to-br from-[#1a1e27] to-[#242b1a]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6">
                {a.type === "image" && (
                  <>
                    <circle cx="8.3" cy="9.5" r="1.6" />
                    <path d="m4 17 5-5 3.5 3.5L17 10l4 4.5" />
                    <rect x="2.5" y="4" width="19" height="16" rx="2" />
                  </>
                )}
                {a.type === "video" && (
                  <>
                    <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
                    <rect x="8" y="6" width="13" height="12" rx="1.5" />
                  </>
                )}
                {a.type === "audio" && (
                  <>
                    <path d="M9 18V6l8-2v12" />
                    <circle cx="6" cy="18" r="2.5" />
                    <circle cx="14" cy="16" r="2.5" />
                  </>
                )}
              </svg>
            </div>
            <div className="text-[12.5px] font-medium">{a.label}</div>
            <div className="mt-0.5 text-[11px] capitalize text-textTertiary">{a.type}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
