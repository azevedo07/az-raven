"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { scenes } from "@/lib/data";
import { useToast } from "@/components/providers/ToastProvider";

export default function TimelinePage() {
  const [selected, setSelected] = useState(2);
  const scene = scenes[selected];
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Timeline</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Ferramenta de edição — clique em uma cena para ver seus detalhes.
          </p>
        </div>
        <Badge>05:00 · 6 cenas</Badge>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2">
        {scenes.map((s, i) => (
          <button
            key={s.n}
            onClick={() => setSelected(i)}
            className={[
              "w-[150px] flex-none overflow-hidden rounded-sm border bg-card text-left transition-all duration-200 ease-az hover:-translate-y-0.5",
              selected === i ? "border-accent shadow-[0_0_0_3px_rgba(212,175,55,0.14)]" : "border-border hover:border-[rgba(212,175,55,0.35)]",
            ].join(" ")}
          >
            <div
              className="relative flex h-16 items-start p-1.5"
              style={{ background: `linear-gradient(135deg, ${s.paleta[0]}, ${s.paleta[1]})` }}
            >
              <span className="rounded-full bg-bg/55 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                {String(s.n).padStart(2, "0")}
              </span>
            </div>
            <div className="p-2.5">
              <div className="truncate text-[11.5px] font-semibold text-white">{s.title}</div>
              <div className="mt-0.5 font-mono text-[10px] text-textTertiary">{s.tempo}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Sequência completa</div>
          <div className="flex flex-col">
            {scenes.map((s, i) => (
              <button
                key={s.n}
                onClick={() => setSelected(i)}
                className={[
                  "flex items-center gap-3 border-b border-border py-2.5 text-left last:border-b-0",
                  selected === i ? "bg-accentSoft/40" : "",
                ].join(" ")}
              >
                <Badge tone={selected === i ? "gold" : "neutral"}>{String(s.n).padStart(2, "0")}</Badge>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-white">{s.title}</div>
                  <div className="text-[11px] text-textTertiary">{s.tempo} · {s.cam}</div>
                </div>
                <Badge tone={statusTone(s.status)}>{s.status}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <div className="sticky top-[82px] h-fit rounded-lg border border-borderStrong bg-panel p-5">
          <div
            className="mb-3.5 h-[130px] rounded-sm"
            style={{ background: `linear-gradient(135deg, ${scene.paleta[0]}, ${scene.paleta[1]})` }}
          />
          <div className="mb-1.5 flex justify-between">
            <Badge>{String(scene.n).padStart(2, "0")}</Badge>
            <Badge tone={statusTone(scene.status)}>{scene.status}</Badge>
          </div>
          <div className="mb-3 text-[15px] font-bold">{scene.title}</div>
          <div className="mb-2 text-[12.5px] text-textSecondary">
            <strong className="font-semibold text-white">Objetivo emocional:</strong> {scene.emo}
          </div>
          <div className="mb-3.5 text-[12.5px] text-textSecondary">
            <strong className="font-semibold text-white">Objetivo narrativo:</strong> {scene.narr}
          </div>
          <div className="mb-4 flex flex-col gap-2 border-t border-border pt-3.5 text-[12px]">
            <div className="flex justify-between"><span className="text-textTertiary">Tempo</span><span className="text-white">{scene.tempo}</span></div>
            <div className="flex justify-between"><span className="text-textTertiary">Câmera</span><span className="text-white">{scene.cam}</span></div>
            <div className="flex justify-between"><span className="text-textTertiary">Iluminação</span><span className="text-right text-white">{scene.luz}</span></div>
          </div>
          <div className="mb-4 flex gap-1.5">
            {scene.paleta.map((c, i) => (
              <span key={i} className="h-4 w-4 rounded-sm border border-white/10" style={{ background: c }} />
            ))}
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              showToast(`Gerando prompts para a cena ${scene.n}…`);
              router.push("/prompt-builder");
            }}
          >
            Gerar Prompt
          </Button>
        </div>
      </div>
    </div>
  );
}
