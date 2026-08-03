import { AssetService } from "../assetService";
import { AssetIdInput, UseCase } from "./shared";

/** Remove um Asset (equivalente a `AssetService.deleteAsset`). */
export interface DeleteAssetUseCase extends UseCase<AssetIdInput, void> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class DeleteAssetUseCaseImpl implements DeleteAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ assetId }: AssetIdInput): Promise<void> {
    return this.assetService.deleteAsset(assetId);
  }
}
