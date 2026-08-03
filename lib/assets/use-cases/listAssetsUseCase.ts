import { Asset } from "../types";
import { AssetService } from "../assetService";
import { ProjectIdInput, UseCase } from "./shared";

/** Lista os Assets de um projeto (equivalente a `AssetService.listAssets`). */
export interface ListAssetsUseCase extends UseCase<ProjectIdInput, Asset[]> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class ListAssetsUseCaseImpl implements ListAssetsUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ projectId }: ProjectIdInput): Promise<Asset[]> {
    return this.assetService.listAssets(projectId);
  }
}
