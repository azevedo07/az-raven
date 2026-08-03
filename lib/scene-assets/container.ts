import "server-only";
import { assetService } from "../assets/container";
import { PrismaSceneAssetRepository } from "./prismaSceneAssetRepository";
import { SceneAssetService } from "./sceneAssetService";
import { AttachAssetToSceneUseCaseImpl } from "./use-cases/attachAssetToSceneUseCase";
import { DetachAssetFromSceneUseCaseImpl } from "./use-cases/detachAssetFromSceneUseCase";
import { ListSceneAssetsUseCaseImpl } from "./use-cases/listSceneAssetsUseCase";
import { UpdateSceneAssetRoleUseCaseImpl } from "./use-cases/updateSceneAssetRoleUseCase";

/**
 * Composition Root exclusivo do Asset Binding Engine (Sprint 2.0) — o
 * **único** lugar do projeto que instancia `PrismaSceneAssetRepository`,
 * `SceneAssetService` e os Use Cases deste módulo. Deliberadamente
 * separado de `lib/application/container.ts` (Pipeline) e
 * `lib/assets/container.ts` (Asset Manager) — cada módulo tem o seu.
 *
 * Consome `assetService`, já composto e exportado por
 * `lib/assets/container.ts` — exatamente o ponto de extensão que aquele
 * arquivo já previa ("Exportada para eventuais consumidores futuros que
 * precisem do Service diretamente"). Isso NÃO altera
 * `lib/assets/container.ts`; só importa o valor que ele já expõe.
 *
 *   PrismaSceneAssetRepository -\
 *                                +-> SceneAssetService -> 4 Use Cases
 *   assetService (lib/assets)  -/      (injetado, não instanciado aqui)
 */

const repository = new PrismaSceneAssetRepository();

/** Instância composta do Scene Asset Service. */
export const sceneAssetService = new SceneAssetService(repository, assetService);

/** Os 4 Use Cases do Asset Binding Engine, cada um montado exatamente uma vez. */
export const sceneAssetUseCases = {
  attachAssetToScene: new AttachAssetToSceneUseCaseImpl(sceneAssetService),
  detachAssetFromScene: new DetachAssetFromSceneUseCaseImpl(sceneAssetService),
  listSceneAssets: new ListSceneAssetsUseCaseImpl(sceneAssetService),
  updateSceneAssetRole: new UpdateSceneAssetRoleUseCaseImpl(sceneAssetService),
};
