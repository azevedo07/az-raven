"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { AssetRecord } from "./utils";

interface DeleteDialogProps {
  asset: AssetRecord | null;
  onClose: () => void;
  onConfirm: (asset: AssetRecord) => Promise<void>;
}

/**
 * Confirmação antes de excluir um Asset (soft delete via
 * `DELETE /api/assets/:id`) — mesmo padrão de confirmação já usado em
 * `components/PipelineVersions.tsx` para restaurar uma versão. Sprint 2.0.
 */
export default function DeleteDialog({ asset, onClose, onConfirm }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!asset) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={asset !== null}
      onClose={() => {
        if (!deleting) onClose();
      }}
      title="Excluir asset"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={deleting}>
            Excluir
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-textSecondary">
        Tem certeza que deseja excluir {asset ? <>&quot;{asset.name}&quot;</> : "este asset"}? O arquivo será removido
        do armazenamento.
      </p>
      {error && <div className="text-[12px] text-danger">{error}</div>}
    </Modal>
  );
}
