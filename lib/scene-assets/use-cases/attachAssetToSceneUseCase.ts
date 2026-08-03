import { SceneAssetWithDetails, SceneAssetRole } from "../types";
import { SceneAssetService } from "../sceneAssetService";
import { SceneIdInput, UseCase } from "./shared";

/** Entrada de `AttachAssetToSceneUseCase`: a cena, o Asset e o papel que ele exerce nela. */
export interface AttachAssetToSceneInput extends SceneIdInput {
  assetId: string;
  role: SceneAssetRole;
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

  async execute({ sceneId, assetId, role }: AttachAssetToSceneInput): Promise<SceneAssetWithDetails> {
    return this.sceneAssetService.attachAsset({ sceneId, assetId, role });
  }
}
