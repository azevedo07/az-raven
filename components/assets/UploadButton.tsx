"use client";

import { useRef } from "react";
import Button from "../ui/Button";

/** Botão "Enviar Asset" — abre o seletor nativo de arquivos. Drag & drop é responsabilidade de `AssetLibrary` (precisa envolver a área toda). Sprint 2.0. */
export default function UploadButton({
  onFilesSelected,
  disabled,
}: {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        data-testid="upload-input"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
          }
          e.target.value = "";
        }}
      />
      <Button variant="secondary" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        Enviar Asset
      </Button>
    </>
  );
}
