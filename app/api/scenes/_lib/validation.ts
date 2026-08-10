import { SUGGESTED_SCENE_ASSET_ROLES } from "@/lib/scene-assets/types";

/**
 * Validação de entrada HTTP — não é regra de negócio, só rejeita entrada
 * obviamente inválida antes de acionar um Use Case.
 *
 * `role` NÃO é validado contra uma lista fechada (ao contrário da
 * Sprint 2.0, quando era um enum de banco): é `String` no schema agora
 * (ver comentário em `prisma/schema.prisma`), então aqui só se garante
 * que é uma string não vazia — o mesmo tratamento que `storageProvider`
 * já recebe em `app/api/assets/`. `SUGGESTED_SCENE_ASSET_ROLES` é
 * reexportado só para quem quiser sugerir valores na UI, não para
 * validar.
 */
export { SUGGESTED_SCENE_ASSET_ROLES };

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Um `role` válido é só uma string não vazia — vocabulário aberto, ver comentário acima. */
export function isValidRole(value: unknown): value is string {
  return isNonEmptyString(value);
}

/** `order` é opcional; quando presente, deve ser um inteiro >= 0. */
export function isValidOrder(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** `metadata` é opcional; quando presente (e não `null`), deve ser um objeto plano (não array, não `null` explícito tratado à parte pelo chamador). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
