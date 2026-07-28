"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { useToast } from "./providers/ToastProvider";

export default function NewProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [tone, setTone] = useState("Gótico-romântico");
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  function handleCreate() {
    setCreating(true);
    setTimeout(() => {
      setCreating(false);
      onClose();
      setName("");
      setText("");
      showToast("Projeto criado com sucesso");
      router.push("/storyboard");
    }, 900);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Projeto"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCreate} loading={creating} disabled={!name.trim()}>
            Criar projeto
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-textSecondary">Nome do projeto</label>
        <input
          className="w-full rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft"
          placeholder="Ex: Anabel Lee — Curta Poético"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-textSecondary">Obra base (texto ou poema)</label>
        <textarea
          className="min-h-[88px] w-full resize-y rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft"
          placeholder="Cole ou descreva o texto literário de referência…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-textSecondary">Tom visual</label>
        <select
          className="w-full appearance-none rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          <option>Gótico-romântico</option>
          <option>Melancólico contemplativo</option>
          <option>Onírico surreal</option>
        </select>
      </div>
    </Modal>
  );
}
