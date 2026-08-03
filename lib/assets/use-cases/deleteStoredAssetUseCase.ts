import { AssetService } from "../assetService";
import { AssetIdInput, UseCase } from "./shared";

/**
 * Remove tanto o registro quanto o arquivo real no Storage de um Asset
 * (equivalente a `AssetService.deleteStoredAsset`). Idempotente — não
 * faz nada se o Asset não existir.
 */
export interface DeleteStoredAssetUseCase extends UseCase<AssetIdInput, void> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository nem o StorageAdapter, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class DeleteStoredAssetUseCaseImpl implements DeleteStoredAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ assetId }: AssetIdInput): Promise<void> {
    return this.assetService.deleteStoredAsset(assetId);
  }
}
