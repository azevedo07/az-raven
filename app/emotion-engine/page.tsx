"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

const points = [
  { x: 0, y: 140, label: "Solidão inicial", detail: "Homem sozinho, tentando esquecer pela leitura" },
  { x: 100, y: 130, label: "Sobressalto", detail: "A batida à porta interrompe o silêncio" },
  { x: 200, y: 118, label: "Presságio", detail: "O corvo entra pela janela" },
  { x: 300, y: 90, label: "Estranhamento", detail: "O corvo se instala sobre o busto de Palas" },
  { x: 400, y: 55, label: "Obsessão", detail: "O interrogatório repetitivo cresce em intensidade" },
  { x: 500, y: 25, label: "Aflição", detail: "O narrador perde a compostura racional" },
  { x: 600, y: 10, label: "Colapso final", detail: "A resposta repetida destrói toda resistência" },
];

export default function EmotionEnginePage() {
  const [active, setActive] = useState(points.length - 1);
  const current = points[active];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">Emotion Engine</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">
          Arco emocional mapeado cena a cena para &quot;O Corvo&quot;.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card flat>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Emoção dominante</div>
          <p className="mt-2 text-[13px] text-textSecondary">Desespero crescente — sem alívio do início ao fim.</p>
        </Card>
        <Card flat>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Emoções secundárias</div>
          <p className="mt-2 text-[13px] text-textSecondary">Solidão, curiosidade inicial, medo, nostalgia.</p>
        </Card>
        <Card flat>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Intensidade</div>
          <p className="mt-2 text-[13px] text-textSecondary">2/10 no início → 10/10 no clímax final.</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Curva de intensidade emocional — clique em um ponto
        </div>
        <svg viewBox="0 0 600 180" className="w-full" style={{ height: 180, overflow: "visible" }}>
          <defs>
            <linearGradient id="emoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#D4AF37" stopOpacity=".35" />
              <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points={`${points.map((p) => `${p.x},${p.y}`).join(" ")} 600,180 0,180`}
            fill="url(#emoFill)"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={active === i ? 7 : 4.5}
              fill={active === i ? "#D4AF37" : "#0B0D10"}
              stroke={i === points.length - 1 ? "#E0605A" : "#D4AF37"}
              strokeWidth={active === i ? 2 : 1.5}
              onClick={() => setActive(i)}
              className="cursor-pointer transition-all"
            />
          ))}
        </svg>
        <div className="mt-4 rounded-sm border border-borderStrong bg-panel p-4">
          <div className="text-[13px] font-semibold text-white">{current.label}</div>
          <div className="mt-1 text-[12.5px] text-textSecondary">{current.detail}</div>
        </div>
      </Card>
    </div>
  );
}
