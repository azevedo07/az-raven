"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { roleLabel, SceneAssetRecord } from "./utils";

interface DetachSceneAssetDialogProps {
  sceneAsset: SceneAssetRecord | null;
  onClose: () => void;
  onConfirm: (sceneAsset: SceneAssetRecord) => Promise<void>;
}

/**
 * Confirmação antes de desvincular um Asset de uma cena (Task "Scene
 * Asset Binding — Storyboard Integration"). Mesmo padrão de
 * `components/assets/DeleteDialog.tsx` (Modal + Button com `loading`),
 * mas semanticamente diferente: aqui só a relação `SceneAsset` é
 * removida via `DELETE /api/scenes/:sceneId/assets/:sceneAssetId` — o
 * Asset original nunca é tocado, e o texto do diálogo deixa isso
 * explícito para o usuário.
 */
export default function DetachSceneAssetDialog({ sceneAsset, onClose, onConfirm }: DetachSceneAssetDialogProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!sceneAsset) return;
    setRemoving(true);
    setError(null);
    try {
      await onConfirm(sceneAsset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal
      open={sceneAsset !== null}
      onClose={() => {
        if (!removing) onClose();
      }}
      title="Remover vínculo"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={removing}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={removing}>
            Remover vínculo
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-textSecondary">
        Remover {sceneAsset ? <>&quot;{sceneAsset.asset.name}&quot;</> : "este asset"}
        {sceneAsset ? <> ({roleLabel(sceneAsset.role)})</> : ""} desta cena? Isso remove só o vínculo — o Asset
        continua disponível na Biblioteca de Assets.
      </p>
      {error && <div className="text-[12px] text-danger">{error}</div>}
    </Modal>
  );
}
