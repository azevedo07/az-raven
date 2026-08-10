import { Asset } from "../assets/types";

/**
 * Asset Binding Engine — contratos de tipo (Sprint 2.0; ponte Scene <->
 * Asset revisada na Task seguinte, "Scene Asset Binding").
 *
 * Domínio de RELACIONAMENTO entre uma cena do Storyboard e um Asset já
 * existente — não duplica o Asset, não move o arquivo, não cria nenhum
 * Storage novo. `SceneAsset` é só o vínculo (id, sceneId, assetId, role,
 * order, metadata, timestamps); o Asset em si continua vivendo
 * inteiramente em `lib/assets/`.
 *
 * `sceneId` é uma string opaca, sem tabela `Scene` no Prisma — o
 * Storyboard hoje é dado mockado (`lib/data.ts`, indexado por número de
 * cena). Mesmo princípio já usado em `ModuleExecution.moduleId`
 * (`lib/pipeline-core/registry.ts` é a fonte de verdade dos módulos, não
 * uma tabela): a fonte de verdade das cenas continua fora do banco.
 */

/**
 * `string`, não uma união fechada — mesmo tratamento de
 * `Asset.storageProvider` (`lib/assets/types.ts`): o vocabulário de
 * papéis já mudou de uma Task para a outra (13 valores orientados a
 * mídia -> lista orientada a finalidade narrativa), provando que não é
 * um conjunto fechado e estável. Suportar um papel novo é só estender a
 * lista de sugestões na camada HTTP/UI, nunca uma migration de banco.
 * `SUGGESTED_SCENE_ASSET_ROLES`, abaixo, existe só para rotular a UI —
 * não é validado como exaustivo em nenhuma camada.
 */
export type SceneAssetRole = string;

/**
 * Papéis conhecidos/sugeridos, usados para rótulos legíveis e sugestões
 * de UI — não uma lista exaustiva nem validada como fechada (ver
 * `SceneAssetRole` acima). União do vocabulário original orientado a
 * mídia (Sprint 2.0) com o vocabulário orientado a finalidade narrativa
 * pedido pela Task seguinte; nenhum valor foi removido, então nenhum
 * vínculo já persistido fica com um papel "desconhecido".
 */
export const SUGGESTED_SCENE_ASSET_ROLES = [
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
  "OUTRO",
] as const;

/** O vínculo em si — sem nenhum dado do Asset embutido (ver `SceneAssetWithDetails` para isso). */
export interface SceneAsset {
  id: string;
  sceneId: string;
  assetId: string;
  role: SceneAssetRole;
  /** Posição do Asset dentro da cena (0-based), para ordenar a listagem. */
  order: number;
  /** Dados adicionais livres do vínculo — `null` quando não definidos. Nenhum Use Case ainda escreve conteúdo aqui. */
  metadata: Record<string, unknown> | null;
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
 * explicitamente pela Sprint 2.0; `ASSET_UPDATED` substitui o antigo
 * `ASSET_ROLE_UPDATED` (renomeado nesta Task porque agora o PATCH pode
 * mudar `role`, `order` e/ou `metadata` — "papel atualizado" deixou de
 * descrever todo update possível). `changes` carrega só os campos de
 * fato alterados. Nenhum consumidor real ainda se inscreve
 * (`subscribe`) fora dos testes — renomear é seguro.
 */
export type SceneAssetDomainEvent =
  | { type: "ASSET_ATTACHED"; sceneAssetId: string; sceneId: string; assetId: string; role: SceneAssetRole }
  | { type: "ASSET_DETACHED"; sceneAssetId: string; sceneId: string; assetId: string }
  | {
      type: "ASSET_UPDATED";
      sceneAssetId: string;
      sceneId: string;
      assetId: string;
      changes: Partial<Pick<SceneAsset, "role" | "order" | "metadata">>;
    };

export type SceneAssetDomainEventListener = (event: SceneAssetDomainEvent) => void;
