import { SceneAssetRole } from "@/lib/scene-assets/types";

/** Validação de entrada HTTP — não é regra de negócio, só rejeita entrada obviamente inválida antes de acionar um Use Case. */
export const SCENE_ASSET_ROLES: readonly SceneAssetRole[] = [
  "REFERENCE_IMAGE",
  "REFERENCE_VIDEO",
  "CONCEPT_ART",
  "STORYBOARD",
  "VOICE",
  "MUSIC",
  "SFX",
  "DOCUMENT",
  "PROMPT",
  "MODEL",
  "TEXTURE",
  "FINAL_RENDER",
  "OUTRO",
];

export function isSceneAssetRole(value: unknown): value is SceneAssetRole {
  return typeof value === "string" && (SCENE_ASSET_ROLES as readonly string[]).includes(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
