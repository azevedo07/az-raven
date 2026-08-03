import { AssetStatus, AssetType } from "@/lib/assets/types";

/**
 * Listas de valores válidos para validação de entrada HTTP — não é
 * regra de negócio (isso continua exclusivo do domínio/Service), é só
 * rejeitar entrada obviamente inválida antes de acionar um Use Case.
 * Espelha os unions de `lib/assets/types.ts` (import de tipo, não de
 * valor — não existe um "enum" exportado de lá para reaproveitar).
 */
export const ASSET_TYPES: readonly AssetType[] = ["image", "video", "audio", "document", "other"];
export const ASSET_STATUSES: readonly AssetStatus[] = ["PENDING", "UPLOADING", "READY", "FAILED", "DELETED"];

export function isAssetType(value: unknown): value is AssetType {
  return typeof value === "string" && (ASSET_TYPES as readonly string[]).includes(value);
}

export function isAssetStatus(value: unknown): value is AssetStatus {
  return typeof value === "string" && (ASSET_STATUSES as readonly string[]).includes(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
