import { SceneAssetWithDetails } from "../types";
import { SceneAssetService } from "../sceneAssetService";
import { SceneIdInput, UseCase } from "./shared";

/** Lista os Assets vinculados a uma cena (equivalente a `SceneAssetService.listSceneAssets`). */
export interface ListSceneAssetsUseCase extends UseCase<SceneIdInput, SceneAssetWithDetails[]> {}

/**
 * Implementação concreta. Depende só do `SceneAssetService`, injetado via
 * construtor — nunca instancia Repository/AssetService diretamente, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class ListSceneAssetsUseCaseImpl implements ListSceneAssetsUseCase {
  constructor(private readonly sceneAssetService: SceneAssetService) {}

  async execute({ sceneId }: SceneIdInput): Promise<SceneAssetWithDetails[]> {
    return this.sceneAssetService.listSceneAssets(sceneId);
  }
}
