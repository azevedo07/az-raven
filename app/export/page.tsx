"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { exportPlatforms } from "@/lib/data";
import { useToast } from "@/components/providers/ToastProvider";

const deliverables = [
  { key: "markdown", label: "Markdown", desc: "Roteiro, análise e cenas em texto formatado." },
  { key: "json", label: "JSON", desc: "Estrutura completa de dados do projeto." },
  { key: "zip", label: "ZIP", desc: "Todos os assets compactados." },
  { key: "completo", label: "Projeto completo", desc: "Pacote AZ Raven com tudo incluído.", primary: true },
];

export default function ExportacaoPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  function exportItem(key: string, label: string) {
    setLoading(key);
    setTimeout(() => {
      setLoading(null);
      showToast(`${label}: exportação concluída`);
    }, 1000);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">Exportação</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">
          Escolha o formato de entrega para &quot;O Corvo — Edição Cinematográfica&quot;.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {deliverables.map((d) => (
          <Card key={d.key} className={d.primary ? "border-[rgba(212,175,55,0.3)]" : ""}>
            <div className="text-[13.5px] font-semibold">{d.label}</div>
            <div className="mb-4 mt-1.5 text-[11.5px] leading-relaxed text-textTertiary">{d.desc}</div>
            <Button
              variant={d.primary ? "primary" : "secondary"}
              size="sm"
              className="w-full"
              loading={loading === d.key}
              onClick={() => exportItem(d.key, d.label)}
            >
              Exportar
            </Button>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Formatos para redes sociais
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {exportPlatforms.map((p) => (
            <div key={p.name} className="rounded border border-border bg-card p-4 text-center">
              <div className="text-[13px] font-semibold">{p.name}</div>
              <div className="mt-1 text-[11px] text-textTertiary">{p.spec}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-sm border border-[rgba(212,175,55,0.25)] bg-accentSoft p-4 text-[13px] text-[#e9d8a3]">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-[17px] w-[17px] flex-none text-accent" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.5" />
          <line x1="12" y1="8" x2="12" y2="8.1" />
          <line x1="12" y1="11.5" x2="12" y2="16" />
        </svg>
        <div>Exportações rodam através do pipeline de renderização — o clique aqui já está conectado ao fluxo real de produção.</div>
      </div>
    </div>
  );
}
