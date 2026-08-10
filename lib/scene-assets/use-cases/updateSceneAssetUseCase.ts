import { SceneAssetWithDetails, SceneAssetRole } from "../types";
import { SceneAssetService } from "../sceneAssetService";
import { SceneAssetIdInput, UseCase } from "./shared";

/**
 * Entrada de `UpdateSceneAssetUseCase`: o vínculo alvo + os campos a
 * alterar (todos opcionais — só os presentes são de fato alterados).
 * Renomeado de `UpdateSceneAssetRoleUseCase`/`UpdateSceneAssetRoleInput`
 * (Sprint 2.0) porque agora cobre `order` e `metadata`, não só `role`.
 */
export interface UpdateSceneAssetInput extends SceneAssetIdInput {
  role?: SceneAssetRole;
  order?: number;
  metadata?: Record<string, unknown> | null;
}

/** Atualiza um vínculo (parcial), ou `undefined` se não existir (equivalente a `SceneAssetService.updateSceneAsset`). */
export interface UpdateSceneAssetUseCase extends UseCase<UpdateSceneAssetInput, SceneAssetWithDetails | undefined> {}

/**
 * Implementação concreta. Depende só do `SceneAssetService`, injetado via
 * construtor — nunca instancia Repository/AssetService diretamente, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class UpdateSceneAssetUseCaseImpl implements UpdateSceneAssetUseCase {
  constructor(private readonly sceneAssetService: SceneAssetService) {}

  async execute({ sceneAssetId, role, order, metadata }: UpdateSceneAssetInput): Promise<SceneAssetWithDetails | undefined> {
    return this.sceneAssetService.updateSceneAsset(sceneAssetId, { role, order, metadata });
  }
}
