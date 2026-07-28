"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { promptCategories } from "@/lib/data";
import { useToast } from "@/components/providers/ToastProvider";

export default function PromptBuilderPage() {
  const [active, setActive] = useState(promptCategories[0].key);
  const { showToast } = useToast();
  const current = promptCategories.find((c) => c.key === active)!;

  function copy() {
    navigator.clipboard?.writeText(current.code).catch(() => {});
    showToast("Prompt copiado para a área de transferência");
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">Prompt Builder</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">
          Prompts gerados para a Cena 03 — &quot;A janela se abre&quot;.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {promptCategories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActive(c.key)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              active === c.key
                ? "border-[rgba(212,175,55,0.3)] bg-accentSoft text-accent"
                : "border-borderStrong text-textSecondary hover:bg-accentSoft hover:text-accent",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Prompt de {current.label}
          </div>
          <Button variant="secondary" size="sm" onClick={copy}>
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copiar
          </Button>
        </div>
        <pre className="whitespace-pre-wrap rounded-sm border border-border bg-bg2 p-4 font-mono text-[12.5px] leading-relaxed text-textSecondary">
          {current.code}
        </pre>
      </Card>
    </div>
  );
}
