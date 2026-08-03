/**
 * Biblioteca de Assets — helpers compartilhados (Sprint 2.0).
 *
 * `AssetRecord` é a forma que a UI enxerga um Asset — o JSON que
 * `GET/POST/PATCH /api/assets` já devolve. Deliberadamente **não**
 * importado de `lib/assets/types.ts`: mesmo sendo "só um tipo" (zero
 * código em runtime), a UI desta Sprint não deve depender de nada de
 * `lib/assets/` — só de HTTP. Mesmo princípio já usado em
 * `components/PipelineDashboard.tsx`/`PipelineTimeline.tsx`/`PipelineVersions.tsx`,
 * que também redefinem localmente a forma dos dados que consomem via
 * fetch, em vez de importar os tipos do Pipeline Service.
 */
export interface AssetRecord {
  id: string;
  projectId: string;
  type: string;
  name: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  hash: string | null;
  storageKey: string | null;
  storageProvider: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Categoria de exibição — mais rica que o `type` que a API persiste
 * (`image`/`video`/`audio`/`document`/`other`, ver `lib/assets/types.ts`).
 * "ai-model" não existe como valor de backend ainda (a rota
 * `POST /api/assets` está congelada nesta Sprint e só aceita os 5 valores
 * acima) — é inferido aqui, no cliente, a partir da extensão do arquivo,
 * puramente para filtrar/exibir. Isso não inventa um recurso de backend
 * que não existe: um Asset cujo `type` persistido é "other" mas cuja
 * extensão é ".safetensors" continua sendo "other" no banco, só aparece
 * como "Modelo IA" na Biblioteca.
 */
export type DisplayAssetType = "image" | "video" | "audio" | "document" | "ai-model" | "other";

const AI_MODEL_EXTENSIONS = new Set([
  "safetensors",
  "ckpt",
  "pt",
  "pth",
  "onnx",
  "gguf",
  "bin",
  "h5",
  "pb",
  "tflite",
]);

/**
 * Aceita só `{ type, extension }` (não o `AssetRecord` inteiro) de
 * propósito — permite reaproveitar esta função a partir de
 * `components/sceneAssets/` (Sprint 2.0), que só tem um resumo do Asset
 * (`SceneAssetSummary` do backend), sem duplicar esta lógica lá.
 * Qualquer `AssetRecord` já satisfaz esse formato mais estreito, então
 * isso não muda nada para quem já chamava com um `AssetRecord` completo.
 */
export function deriveDisplayType(asset: Pick<AssetRecord, "type" | "extension">): DisplayAssetType {
  const extension = asset.extension.toLowerCase().replace(/^\./, "");
  if (AI_MODEL_EXTENSIONS.has(extension)) {
    return "ai-model";
  }
  if (asset.type === "image" || asset.type === "video" || asset.type === "audio" || asset.type === "document") {
    return asset.type;
  }
  return "other";
}

/** Categoria de backend válida (as únicas 5 que `POST /api/assets` aceita) a partir do MIME type de um File escolhido para upload. */
export function backendTypeFromMime(mimeType: string): "image" | "video" | "audio" | "document" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf" || mimeType.startsWith("text/") || mimeType.includes("document")) {
    return "document";
  }
  return "other";
}

export function extensionFromFileName(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

const DISPLAY_TYPE_LABEL: Record<DisplayAssetType, string> = {
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  document: "Documento",
  "ai-model": "Modelo IA",
  other: "Outro",
};

export function displayTypeLabel(type: DisplayAssetType): string {
  return DISPLAY_TYPE_LABEL[type];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  UPLOADING: "Enviando",
  READY: "Pronto",
  FAILED: "Falhou",
  DELETED: "Removido",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusTone(status: string): "gold" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "READY":
      return "success";
    case "UPLOADING":
    case "PENDING":
      return "gold";
    case "FAILED":
      return "danger";
    case "DELETED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString("pt-BR")} · ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function downloadUrlFor(assetId: string): string {
  return `/api/assets/${assetId}/download`;
}

/**
 * Envia um arquivo via `XMLHttpRequest`, não `fetch` — é a única API do
 * navegador com suporte amplo a eventos de progresso de upload
 * (`xhr.upload.onprogress`), necessário para a barra de progresso.
 * `fetch` não expõe isso de forma amplamente suportada.
 */
export function uploadFileWithProgress(
  assetId: string,
  file: File,
  callbacks: {
    onProgress?: (percent: number) => void;
    onXhrReady?: (xhr: XMLHttpRequest) => void;
  } = {}
): Promise<AssetRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    callbacks.onXhrReady?.(xhr);

    const formData = new FormData();
    formData.set("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        callbacks.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Resposta inválida do servidor."));
        }
      } else {
        let message = "Falha ao enviar o arquivo.";
        try {
          message = JSON.parse(xhr.responseText)?.error?.message ?? message;
        } catch {
          // corpo não é JSON — mantém a mensagem genérica.
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Falha de rede ao enviar o arquivo.")));

    xhr.addEventListener("abort", () => {
      const error = new Error("Upload cancelado.");
      error.name = "AbortError";
      reject(error);
    });

    xhr.open("POST", `/api/assets/${assetId}/upload`);
    xhr.send(formData);
  });
}
