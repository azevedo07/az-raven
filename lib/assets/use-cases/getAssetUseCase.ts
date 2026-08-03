import { Asset } from "../types";
import { AssetService } from "../assetService";
import { AssetIdInput, UseCase } from "./shared";

/** Busca um Asset pelo id, ou `undefined` se não existir (equivalente a `AssetService.getAsset`). */
export interface GetAssetUseCase extends UseCase<AssetIdInput, Asset | undefined> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class GetAssetUseCaseImpl implements GetAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ assetId }: AssetIdInput): Promise<Asset | undefined> {
    return this.assetService.getAsset(assetId);
  }
}
