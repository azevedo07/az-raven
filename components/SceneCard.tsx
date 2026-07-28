"use client";

import { useRouter } from "next/navigation";
import { Scene } from "@/lib/types";
import Badge, { statusTone } from "./ui/Badge";
import Button from "./ui/Button";
import { useToast } from "./providers/ToastProvider";

export default function SceneCard({ scene }: { scene: Scene }) {
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-transform duration-200 ease-az hover:-translate-y-1 hover:border-borderStrong hover:shadow-lg">
      <div
        className="relative flex h-[170px] items-end p-3.5"
        style={{ background: `linear-gradient(135deg, ${scene.paleta[0]}, ${scene.paleta[1]})` }}
      >
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/55" />
        <span className="absolute left-3 top-3 z-10 rounded-full border border-[rgba(212,175,55,0.3)] bg-bg/55 px-2.5 py-1 font-mono text-[11px] font-semibold text-accent backdrop-blur-sm">
          CENA {String(scene.n).padStart(2, "0")}
        </span>
        <span className="absolute right-3 top-3 z-10">
          <Badge tone={statusTone(scene.status)}>{scene.status}</Badge>
        </span>
        <span className="z-10 text-[15px] font-bold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
          {scene.title}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="text-[12.5px] leading-relaxed text-textSecondary">
          <strong className="font-semibold text-white">Objetivo emocional:</strong> {scene.emo}
        </div>
        <div className="text-[12.5px] leading-relaxed text-textSecondary">
          <strong className="font-semibold text-white">Objetivo narrativo:</strong> {scene.narr}
        </div>
        <div className="flex flex-wrap gap-3.5 border-t border-border pt-2.5 text-[11px] text-textTertiary">
          <span>{scene.duracao}</span>
          <span>{scene.cam}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-textTertiary">{scene.luz}</span>
          <div className="flex gap-1.5">
            {scene.paleta.map((c, i) => (
              <span key={i} className="h-3.5 w-3.5 rounded-sm border border-white/10" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 border border-borderStrong"
            onClick={() => showToast(`Abrindo cena ${scene.n} em tela cheia`)}
          >
            Abrir Cena
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 border border-borderStrong"
            onClick={() => showToast(`Modo de edição da cena ${scene.n}`)}
          >
            Editar
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
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
