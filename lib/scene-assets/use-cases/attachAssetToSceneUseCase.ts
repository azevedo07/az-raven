import { SceneAssetWithDetails, SceneAssetRole } from "../types";
import { SceneAssetService } from "../sceneAssetService";
import { SceneIdInput, UseCase } from "./shared";

/**
 * Entrada de `AttachAssetToSceneUseCase`: a cena, o Asset, o papel que
 * ele exerce nela e, opcionalmente, sua posição (`order`) e `metadata`
 * livre. Quando `order` é omitido, o Repository anexa ao final da cena.
 */
export interface AttachAssetToSceneInput extends SceneIdInput {
  assetId: string;
  role: SceneAssetRole;
  order?: number;
  metadata?: Record<string, unknown> | null;
}

/**
 * Vincula um Asset já existente a uma cena (equivalente a
 * `SceneAssetService.attachAsset`).
 *
 * @throws {import("../errors").SceneAssetTargetNotFoundError} se o Asset não existir.
 * @throws {import("../errors").SceneAssetAlreadyLinkedError} se já estiver vinculado com o mesmo papel.
 */
export interface AttachAssetToSceneUseCase extends UseCase<AttachAssetToSceneInput, SceneAssetWithDetails> {}

/**
 * Implementação concreta. Depende só do `SceneAssetService`, injetado via
 * construtor — nunca instancia Repository/AssetService diretamente, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class AttachAssetToSceneUseCaseImpl implements AttachAssetToSceneUseCase {
  constructor(private readonly sceneAssetService: SceneAssetService) {}

  async execute({ sceneId, assetId, role, order, metadata }: AttachAssetToSceneInput): Promise<SceneAssetWithDetails> {
    return this.sceneAssetService.attachAsset({ sceneId, assetId, role, order, metadata });
  }
}
