import { SceneAssetWithDetails, SceneAssetRole } from "../types";
import { SceneAssetService } from "../sceneAssetService";
import { SceneAssetIdInput, UseCase } from "./shared";

/** Entrada de `UpdateSceneAssetRoleUseCase`: o vínculo alvo + o novo papel. */
export interface UpdateSceneAssetRoleInput extends SceneAssetIdInput {
  role: SceneAssetRole;
}

/** Atualiza o papel de um vínculo, ou `undefined` se não existir (equivalente a `SceneAssetService.updateRole`). */
export interface UpdateSceneAssetRoleUseCase extends UseCase<UpdateSceneAssetRoleInput, SceneAssetWithDetails | undefined> {}

/**
 * Implementação concreta. Depende só do `SceneAssetService`, injetado via
 * construtor — nunca instancia Repository/AssetService diretamente, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class UpdateSceneAssetRoleUseCaseImpl implements UpdateSceneAssetRoleUseCase {
  constructor(private readonly sceneAssetService: SceneAssetService) {}

  async execute({ sceneAssetId, role }: UpdateSceneAssetRoleInput): Promise<SceneAssetWithDetails | undefined> {
    return this.sceneAssetService.updateRole(sceneAssetId, role);
  }
}
