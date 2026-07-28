"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { platformStrategies, thumbnailConcepts, publicationChecklist } from "@/lib/data";

const platformKeys = Object.keys(platformStrategies);

export default function AudienceIntelligencePage() {
  const [activePlatform, setActivePlatform] = useState(platformKeys[0]);
  const strategy = platformStrategies[activePlatform];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Audience Intelligence Engine</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Preparação do projeto para publicação — apresentar melhor a obra, nunca manipular
            algoritmo.
          </p>
        </div>
        <Badge tone="success" dot>
          Análise concluída
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card flat>
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Análise de retenção
          </div>
          <div className="flex flex-col gap-2 text-[12.5px]">
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-textTertiary">Gancho inicial</span>
              <span className="text-white">A batida na porta vazia</span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-textTertiary">Maior impacto</span>
              <span className="text-white">Cenas 03 e 06</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-textTertiary">Risco de queda</span>
              <span className="text-white">Cena 05 (mais longa)</span>
            </div>
          </div>
        </Card>
        <Card flat>
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Análise de ritmo
          </div>
          <div className="flex flex-col gap-2 text-[12.5px]">
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-textTertiary">Arco geral</span>
              <span className="text-white">Contemplativo → tenso → colapsado</span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-textTertiary">Silêncio</span>
              <span className="text-white">Cena 04, propositalmente quase muda</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-textTertiary">Sugestão</span>
              <span className="text-white">Cena 03 como mini clímax intermediário</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {platformKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActivePlatform(key)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              activePlatform === key
                ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
                : "border-borderStrong text-textSecondary hover:bg-accentSoft hover:text-accent",
            ].join(" ")}
          >
            {platformStrategies[key].label}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{strategy.label}</div>
        <div className="flex flex-col">
          {strategy.rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-border py-2.5 text-[12.5px] last:border-b-0">
              <span className="flex-none text-textTertiary">{label}</span>
              <span className="text-right text-white">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Thumbnail Studio — 3 conceitos
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {thumbnailConcepts.map((t) => (
            <div key={t.title} className="overflow-hidden rounded border border-border bg-card">
              <div
                className="flex h-[110px] items-end p-3"
                style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
              >
                <span className="text-sm font-extrabold text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                  {t.title}
                </span>
              </div>
              <div className="p-3">
                <Badge tone="gold">{t.emotion}</Badge>
                <div className="mt-2 text-[11px] leading-relaxed text-textTertiary">{t.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Checklist de publicação
        </div>
        <div className="flex flex-col">
          {publicationChecklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 border-b border-border py-2.5 text-[12.5px] last:border-b-0">
              <span
                className={[
                  "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-sm border",
                  item.done ? "border-success bg-successSoft text-success" : "border-borderStrong bg-white/[0.04]",
                ].join(" ")}
              >
                {item.done && (
                  <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className={item.done ? "" : "text-textTertiary"}>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
