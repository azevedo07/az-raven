import { deriveDisplayType } from "../assets/utils";

/**
 * Asset Binding Engine — UI (Sprint 2.0; `order`/`metadata` adicionados
 * na Task "Scene Asset Binding"). `SceneAssetRecord` espelha o JSON que
 * `GET/POST/PATCH /api/scenes/:sceneId/assets*` já devolve — redefinido
 * localmente, não importado de `lib/scene-assets/types.ts`, mesmo
 * princípio já usado em `components/assets/utils.ts`: a UI só depende de
 * HTTP, nunca do domínio em si.
 */
export interface SceneAssetRecord {
  id: string;
  sceneId: string;
  assetId: string;
  role: string;
  order: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  asset: {
    id: string;
    name: string;
    type: string;
    mimeType: string;
    extension: string;
    size: number;
    status: string;
    storageProvider: string | null;
  };
}

/**
 * `string`, não uma união fechada — `role` deixou de ser um enum de
 * banco (ver `prisma/schema.prisma`); `SCENE_ASSET_ROLES` abaixo é só a
 * lista de sugestões mostrada no picker, não um conjunto validado.
 */
export type SceneAssetRole = string;

/** Papéis conhecidos/sugeridos para o seletor de papel na UI — não exaustivo (ver `SceneAssetRole` acima). */
export const SCENE_ASSET_ROLES = [
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
  "CHARACTER",
  "LOCATION",
  "PROP",
  "STYLE",
  "OUTRO",
] as const;

const ROLE_LABEL: Record<string, string> = {
  REFERENCE_IMAGE: "Imagem Referência",
  REFERENCE_VIDEO: "Vídeo Referência",
  CONCEPT_ART: "Concept Art",
  STORYBOARD: "Storyboard",
  VOICE: "Voz",
  MUSIC: "Música",
  SFX: "SFX",
  DOCUMENT: "Documento",
  PROMPT: "Prompt",
  MODEL: "Modelo IA",
  TEXTURE: "Textura",
  FINAL_RENDER: "Render Final",
  CHARACTER: "Personagem",
  LOCATION: "Cenário",
  PROP: "Objeto de Cena",
  STYLE: "Estilo",
  OUTRO: "Outro",
};

/** Rótulo legível de um papel conhecido; devolve o próprio valor para um papel fora da lista de sugestões (vocabulário aberto). */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/**
 * Papel padrão sugerido para um Asset recém-vinculado, com base na sua
 * categoria de exibição (`deriveDisplayType`, `components/assets/utils.ts`)
 * — só um valor inicial razoável; o usuário pode trocar depois via
 * `PATCH /api/scenes/:sceneId/assets/:sceneAssetId` (`UpdateSceneAssetUseCase`).
 */
export function defaultRoleForDisplayType(displayType: string): SceneAssetRole {
  switch (displayType) {
    case "image":
      return "REFERENCE_IMAGE";
    case "video":
      return "REFERENCE_VIDEO";
    case "audio":
      return "MUSIC";
    case "document":
      return "DOCUMENT";
    case "ai-model":
      return "MODEL";
    default:
      return "OUTRO";
  }
}

/**
 * Filtro de tipo do `SceneAssetPicker` — um recorte diferente (e menor)
 * do que `DisplayAssetType` (`components/assets/utils.ts`): "prompt" não
 * é uma categoria de arquivo real, é inferida por extensão de texto
 * comum (mesmo princípio de "ai-model" — heurística de exibição, não uma
 * mudança de contrato de backend), só dentro deste picker.
 */
export type PickerTypeFilter = "all" | "image" | "video" | "audio" | "prompt" | "ai-model";

const PROMPT_EXTENSIONS = new Set(["txt", "md", "json", "yml", "yaml", "prompt"]);

const PICKER_FILTER_LABEL: Record<PickerTypeFilter, string> = {
  all: "Todos",
  image: "Imagens",
  video: "Vídeos",
  audio: "Áudio",
  prompt: "Prompts",
  "ai-model": "Modelos IA",
};

export function pickerFilterLabel(filter: PickerTypeFilter): string {
  return PICKER_FILTER_LABEL[filter];
}

export function matchesPickerFilter(asset: { type: string; extension: string }, filter: PickerTypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "prompt") {
    return asset.type === "document" && PROMPT_EXTENSIONS.has(asset.extension.toLowerCase().replace(/^\./, ""));
  }
  return deriveDisplayType(asset) === filter;
}
