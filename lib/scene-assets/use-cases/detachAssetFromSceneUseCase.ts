import { SceneAssetService } from "../sceneAssetService";
import { SceneAssetIdInput, UseCase } from "./shared";

/**
 * Remove um vínculo entre cena e Asset (equivalente a
 * `SceneAssetService.detachAsset`). Devolve `true` se algo foi de fato
 * removido, `false` se `sceneAssetId` não existia.
 */
export interface DetachAssetFromSceneUseCase extends UseCase<SceneAssetIdInput, boolean> {}

/**
 * Implementação concreta. Depende só do `SceneAssetService`, injetado via
 * construtor — nunca instancia Repository/AssetService diretamente, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class DetachAssetFromSceneUseCaseImpl implements DetachAssetFromSceneUseCase {
  constructor(private readonly sceneAssetService: SceneAssetService) {}

  async execute({ sceneAssetId }: SceneAssetIdInput): Promise<boolean> {
    return this.sceneAssetService.detachAsset(sceneAssetId);
  }
}
