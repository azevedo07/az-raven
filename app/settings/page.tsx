"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/providers/ToastProvider";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={[
        "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-sm border transition-colors",
        checked ? "border-accent bg-accent" : "border-borderStrong bg-white/[0.04]",
      ].join(" ")}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] text-[#181008]" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

export default function ConfiguracoesPage() {
  const [backup, setBackup] = useState(true);
  const [notifyRender, setNotifyRender] = useState(true);
  const [soundOnStep, setSoundOnStep] = useState(false);
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">Configurações</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">Preferências do seu estúdio.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Aparência</div>
          <div className="mb-3.5 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-textSecondary">Tema</label>
            <select className="w-full appearance-none rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none">
              <option>Cinematic Dark (padrão)</option>
              <option disabled>Cinematic Light — em breve</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-textSecondary">Idioma da interface</label>
            <select
              className="w-full appearance-none rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none"
              onChange={(e) => showToast(`Idioma alterado para ${e.target.value}`)}
            >
              <option>Português (Brasil)</option>
              <option>English</option>
              <option>Español</option>
            </select>
          </div>
        </Card>

        <Card>
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Produções</div>
          <div className="mb-3.5 flex items-center gap-2.5">
            <Toggle checked={backup} onChange={() => setBackup((v) => !v)} />
            <span className="text-[13px] text-textSecondary">
              Salvar backup automático diário dos meus projetos
            </span>
          </div>
          <div className="mb-3.5 flex items-center gap-2.5">
            <Toggle checked={notifyRender} onChange={() => setNotifyRender((v) => !v)} />
            <span className="text-[13px] text-textSecondary">
              Avisar quando uma renderização for concluída
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Toggle checked={soundOnStep} onChange={() => setSoundOnStep((v) => !v)} />
            <span className="text-[13px] text-textSecondary">
              Tocar som ao concluir uma etapa da produção
            </span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Conta</div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#8a6f22] text-[15px] font-bold text-[#181008]">
            CM
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">Cauê Martins</div>
            <div className="text-xs text-textTertiary">Diretor Criativo · AZ Studio</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
