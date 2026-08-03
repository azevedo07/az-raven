import { Asset } from "../types";
import { UpdateAssetInput } from "../repository";
import { AssetService } from "../assetService";
import { AssetIdInput, UseCase } from "./shared";

/** Entrada de `UpdateAssetUseCase`: o Asset alvo + os campos a atualizar. */
export interface UpdateAssetUseCaseInput extends AssetIdInput {
  data: UpdateAssetInput;
}

/** Atualiza campos parciais de um Asset, ou `undefined` se não existir (equivalente a `AssetService.updateAsset`). */
export interface UpdateAssetUseCase extends UseCase<UpdateAssetUseCaseInput, Asset | undefined> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class UpdateAssetUseCaseImpl implements UpdateAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ assetId, data }: UpdateAssetUseCaseInput): Promise<Asset | undefined> {
    return this.assetService.updateAsset(assetId, data);
  }
}
