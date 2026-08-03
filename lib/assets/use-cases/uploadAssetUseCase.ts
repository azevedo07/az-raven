import { Asset } from "../types";
import { AssetService } from "../assetService";
import { AssetIdInput, UseCase } from "./shared";

/** Entrada de `UploadAssetUseCase`: o Asset alvo (já criado, "PENDING") + os bytes a enviar. */
export interface UploadAssetInput extends AssetIdInput {
  data: Buffer | NodeJS.ReadableStream;
  contentType?: string;
}

/**
 * Envia o conteúdo de um Asset para o Storage e atualiza o registro para
 * "READY" (equivalente a `AssetService.uploadAsset`). `undefined` se o
 * Asset não existir.
 */
export interface UploadAssetUseCase extends UseCase<UploadAssetInput, Asset | undefined> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository nem o StorageAdapter, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class UploadAssetUseCaseImpl implements UploadAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ assetId, data, contentType }: UploadAssetInput): Promise<Asset | undefined> {
    return this.assetService.uploadAsset(assetId, data, { contentType });
  }
}
