"use client";

import { downloadUrlFor } from "./utils";

/**
 * Baixa um Asset via `GET /api/assets/:id/download` — nunca acessa
 * Storage diretamente. Um `<a download>` clicado programaticamente deixa
 * o próprio navegador tratar a resposta (que já vem com
 * `Content-Disposition: attachment`, definido pela rota) — sem precisar
 * buscar o arquivo inteiro via `fetch`/blob só para salvar.
 */
export default function DownloadButton({
  assetId,
  fileName,
  label = "Baixar",
}: {
  assetId: string;
  fileName: string;
  label?: string;
}) {
  function handleDownload() {
    const link = document.createElement("a");
    link.href = downloadUrlFor(assetId);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={handleDownload}
      className="flex h-7 w-7 items-center justify-center rounded-md text-textTertiary transition-colors duration-150 ease-az hover:bg-white/[0.06] hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    </button>
  );
}
