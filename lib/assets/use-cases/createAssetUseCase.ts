import { Asset } from "../types";
import { CreateAssetInput } from "../repository";
import { AssetService } from "../assetService";
import { UseCase } from "./shared";

/** Cria um novo Asset (equivalente a `AssetService.createAsset`). */
export interface CreateAssetUseCase extends UseCase<CreateAssetInput, Asset> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class CreateAssetUseCaseImpl implements CreateAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute(input: CreateAssetInput): Promise<Asset> {
    return this.assetService.createAsset(input);
  }
}
