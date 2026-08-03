import { SceneAsset, SceneAssetRole } from "./types";

/**
 * Contrato de persistência do Asset Binding Engine (Sprint 2.0). Mesmo
 * princípio do `AssetRepository`/`PipelineRepository`: o Service depende
 * só desta interface, nunca de `PrismaSceneAssetRepository` diretamente.
 *
 * Só persistência — nenhuma regra de negócio. Em particular, este
 * Repository nunca consulta `Asset`/`AssetRepository`: "o Asset existe?"
 * é responsabilidade do `SceneAssetService` (que já tem o `AssetService`
 * injetado), não deste contrato.
 */

export interface AttachAssetInput {
  sceneId: string;
  assetId: string;
  role: SceneAssetRole;
}

export interface SceneAssetRepository {
  /**
   * Cria o vínculo.
   * @throws {import("./errors").SceneAssetAlreadyLinkedError} se (sceneId, assetId, role) já existir.
   */
  attach(input: AttachAssetInput): Promise<SceneAsset>;

  /** Remove o vínculo. Idempotente — não lança se `id` não existir. */
  detach(id: string): Promise<void>;

  /** Busca um vínculo pelo id, ou `undefined` se não existir. */
  findById(id: string): Promise<SceneAsset | undefined>;

  /** Lista os vínculos de uma cena, em ordem de criação. */
  listBySceneId(sceneId: string): Promise<SceneAsset[]>;

  /**
   * Atualiza o papel de um vínculo existente; `undefined` se `id` não existir.
   * @throws {import("./errors").SceneAssetAlreadyLinkedError} se o novo papel colidir com outro vínculo já existente para o mesmo (sceneId, assetId).
   */
  updateRole(id: string, role: SceneAssetRole): Promise<SceneAsset | undefined>;
}
