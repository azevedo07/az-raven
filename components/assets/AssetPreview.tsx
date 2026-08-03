"use client";

import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import DownloadButton from "./DownloadButton";
import {
  AssetRecord,
  deriveDisplayType,
  displayTypeLabel,
  downloadUrlFor,
  formatBytes,
  formatDate,
  statusLabel,
  statusTone,
} from "./utils";

interface AssetPreviewProps {
  asset: AssetRecord | null;
  onClose: () => void;
  onDeleteRequest: (asset: AssetRecord) => void;
  onCopyName: (asset: AssetRecord) => void;
  onCopyId: (asset: AssetRecord) => void;
}

/**
 * Pré-visualização grande de um Asset (Sprint 2.0). Imagem/vídeo/áudio
 * apontam `src` direto para `GET /api/assets/:id/download` — o
 * navegador busca os bytes como um subrecurso normal (não é uma
 * navegação de página inteira, então o cabeçalho
 * `Content-Disposition: attachment` da rota, que só afeta navegação de
 * nível superior/clique, não impede o elemento de mídia de carregar e
 * decodificar o conteúdo).
 *
 * PDF/documento/outro/modelo de IA não tentam pré-visualização inline
 * (um `<iframe>` apontando para uma resposta "attachment" é uma
 * navegação, então dispara o download em vez de renderizar) — mostram um
 * cartão com ícone + "Baixar" em vez disso. Honesto em vez de uma
 * pré-visualização que pareceria quebrada.
 */
export default function AssetPreview({ asset, onClose, onDeleteRequest, onCopyName, onCopyId }: AssetPreviewProps) {
  const type = asset ? deriveDisplayType(asset) : null;
  const url = asset ? downloadUrlFor(asset.id) : "";

  return (
    <Modal open={asset !== null} onClose={onClose} title={asset?.name ?? ""}>
      {asset && type && (
      <div className="flex flex-col gap-4">
        <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-md border border-border bg-[#0b0e13]">
          {type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={asset.name} className="max-h-[420px] w-full object-contain" />
          )}
          {type === "video" && <video src={url} controls className="max-h-[420px] w-full" />}
          {type === "audio" && (
            <div className="w-full p-6">
              <audio src={url} controls className="w-full" />
            </div>
          )}
          {(type === "document" || type === "ai-model" || type === "other") && (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-textTertiary" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
                <path d="M14 2.5V7h4" />
              </svg>
              <p className="text-[12.5px] text-textSecondary">Não é possível pré-visualizar este arquivo.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
          <Field label="Tipo" value={displayTypeLabel(type)} />
          <Field label="Tamanho" value={formatBytes(asset.size)} />
          <Field label="Status" value={<Badge tone={statusTone(asset.status)}>{statusLabel(asset.status)}</Badge>} />
          <Field label="Enviado em" value={formatDate(asset.createdAt)} />
          <Field label="Provedor" value={asset.storageProvider ?? "—"} />
          <Field label="ID" value={<span className="font-mono text-[11px]">{asset.id}</span>} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onCopyName(asset)}
            className="rounded-sm border border-borderStrong px-3 py-1.5 text-xs text-textSecondary hover:bg-white/[0.06] hover:text-white"
          >
            Copiar nome
          </button>
          <button
            type="button"
            onClick={() => onCopyId(asset)}
            className="rounded-sm border border-borderStrong px-3 py-1.5 text-xs text-textSecondary hover:bg-white/[0.06] hover:text-white"
          >
            Copiar ID
          </button>
          <DownloadButton assetId={asset.id} fileName={asset.originalName} label="Baixar arquivo" />
          <button
            type="button"
            onClick={() => onDeleteRequest(asset)}
            className="rounded-sm border border-[rgba(224,96,90,0.3)] bg-dangerSoft px-3 py-1.5 text-xs text-[#f2a19d] hover:bg-[rgba(224,96,90,0.22)]"
          >
            Excluir
          </button>
        </div>
      </div>
      )}
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] uppercase tracking-wide text-textTertiary">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
