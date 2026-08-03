import { Asset } from "../assets/types";

/**
 * Asset Binding Engine — contratos de tipo (Sprint 2.0).
 *
 * Domínio de RELACIONAMENTO entre uma cena do Storyboard e um Asset já
 * existente — não duplica o Asset, não move o arquivo, não cria nenhum
 * Storage novo. `SceneAsset` é só o vínculo (id, sceneId, assetId, role,
 * timestamps); o Asset em si continua vivendo inteiramente em
 * `lib/assets/`.
 *
 * `sceneId` é uma string opaca, sem tabela `Scene` no Prisma — o
 * Storyboard hoje é dado mockado (`lib/data.ts`, indexado por número de
 * cena). Mesmo princípio já usado em `ModuleExecution.moduleId`
 * (`lib/pipeline-core/registry.ts` é a fonte de verdade dos módulos, não
 * uma tabela): a fonte de verdade das cenas continua fora do banco.
 */
export type SceneAssetRole =
  | "REFERENCE_IMAGE"
  | "REFERENCE_VIDEO"
  | "CONCEPT_ART"
  | "STORYBOARD"
  | "VOICE"
  | "MUSIC"
  | "SFX"
  | "DOCUMENT"
  | "PROMPT"
  | "MODEL"
  | "TEXTURE"
  | "FINAL_RENDER"
  | "OUTRO";

/** O vínculo em si — sem nenhum dado do Asset embutido (ver `SceneAssetWithDetails` para isso). */
export interface SceneAsset {
  id: string;
  sceneId: string;
  assetId: string;
  role: SceneAssetRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Um resumo do Asset vinculado — só os campos que a cena precisa exibir
 * (miniatura/ícone por tipo, status, tamanho), não o `Asset` completo.
 * Deliberadamente um subconjunto de `Asset` (`lib/assets/types.ts`), não
 * o tipo inteiro — este domínio só precisa saber o suficiente para
 * exibir, nunca decide nada sobre upload/storage do Asset.
 */
export interface SceneAssetSummary {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  extension: string;
  size: number;
  status: string;
  storageProvider: string | null;
}

/** `SceneAsset` + o resumo do Asset que ele referencia — o que `ListSceneAssetsUseCase` devolve. */
export interface SceneAssetWithDetails extends SceneAsset {
  asset: SceneAssetSummary;
}

export function toSceneAssetSummary(asset: Asset): SceneAssetSummary {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    mimeType: asset.mimeType,
    extension: asset.extension,
    size: asset.size,
    status: asset.status,
    storageProvider: asset.storageProvider,
  };
}

/**
 * Evento de domínio do Asset Binding Engine — separado de
 * `AssetDomainEvent` (`lib/assets/types.ts`) e de
 * `PipelineEventRecord`/`PipelineEngineEvent` (Pipeline), que permanecem
 * intocados. `ASSET_ATTACHED`/`ASSET_DETACHED` são os dois pedidos
 * explicitamente pela Sprint; `ASSET_ROLE_UPDATED` foi acrescentado pelo
 * mesmo motivo que `AssetUpdated` existe no Asset Manager — toda
 * mutação tem um evento correspondente, nenhuma fica invisível para um
 * futuro consumidor de histórico/timeline.
 */
export type SceneAssetDomainEvent =
  | { type: "ASSET_ATTACHED"; sceneAssetId: string; sceneId: string; assetId: string; role: SceneAssetRole }
  | { type: "ASSET_DETACHED"; sceneAssetId: string; sceneId: string; assetId: string }
  | { type: "ASSET_ROLE_UPDATED"; sceneAssetId: string; sceneId: string; assetId: string; role: SceneAssetRole };

export type SceneAssetDomainEventListener = (event: SceneAssetDomainEvent) => void;
