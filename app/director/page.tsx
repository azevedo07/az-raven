"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { scenes } from "@/lib/data";

const justifications: Record<number, { q: string; a: string }[]> = {
  1: [
    { q: "Por que esta câmera?", a: "Plano fixo — estabelece o isolamento antes de qualquer movimento." },
    { q: "Por que esta iluminação?", a: "Vela única — sombras longas reforçam a solidão." },
    { q: "Referências fílmicas", a: "Sleepy Hollow (1999), The Others (2001)" },
  ],
  3: [
    { q: "Por que esta câmera?", a: "Steadicam — para que o movimento do corvo pareça vivo, não coreografado." },
    { q: "Por que esta lente?", a: "35mm — aproxima o espectador do quarto sem distorcer." },
    { q: "Por que esta iluminação?", a: "Chiaroscuro com vela única — o corvo emerge da escuridão." },
    { q: "Por que esta paleta?", a: "Preto e dourado velho — riqueza visual sem competir com o tom sombrio." },
    { q: "Por que este ritmo?", a: "Lento na entrada, abrupto no pouso — imita uma interrupção real." },
    { q: "Referências fílmicas", a: "Sleepy Hollow (1999), The Others (2001), Crimson Peak (2015)" },
  ],
  6: [
    { q: "Por que esta câmera?", a: "Zoom-out lento — isola a figura, comunicando abandono." },
    { q: "Por que este ritmo?", a: "Sem cortes — o público precisa sentir o tempo esticar." },
    { q: "Referências fílmicas", a: "Requiem for a Dream (2000), The Lighthouse (2019)" },
  ],
};

export default function DirectorEnginePage() {
  const [sceneN, setSceneN] = useState(3);
  const scene = scenes.find((s) => s.n === sceneN)!;
  const items = justifications[sceneN] ?? justifications[3];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Director Engine</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Linguagem cinematográfica aplicada à cena selecionada.
          </p>
        </div>
        <select
          value={sceneN}
          onChange={(e) => setSceneN(Number(e.target.value))}
          className="w-[260px] appearance-none rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none focus:border-accent"
        >
          {scenes.map((s) => (
            <option key={s.n} value={s.n}>
              Cena {String(s.n).padStart(2, "0")} — {s.title}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <div className="mb-1 text-[15px] font-bold">
          Cena {String(scene.n).padStart(2, "0")} — {scene.title}
        </div>
        <div className="mb-4 text-[12.5px] text-textTertiary">{scene.emo}</div>
        <div className="flex flex-col">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between gap-4 border-b border-border py-2.5 text-[12.5px] last:border-b-0">
              <span className="flex-none text-textTertiary">{item.q}</span>
              <span className="text-right font-medium text-white">{item.a}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
