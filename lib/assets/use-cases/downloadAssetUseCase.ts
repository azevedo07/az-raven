import { AssetService } from "../assetService";
import { DownloadResult } from "../../storage/types";
import { AssetIdInput, UseCase } from "./shared";

/**
 * Lê o conteúdo de um Asset do Storage (equivalente a
 * `AssetService.downloadAsset`). `undefined` se o Asset não existir, ou
 * se existir mas nunca terminou de subir (sem `storageKey` ainda).
 *
 * `DownloadResult` vem de `lib/storage/types.ts` — é um tipo de dado
 * puro (a forma do que foi baixado), não a implementação do Storage;
 * importá-lo aqui para tipar a saída não viola "Use Case conhece só o
 * AssetService", mesmo princípio já aplicado a `PipelineTimelineEntry`
 * nos Use Cases do Pipeline.
 */
export interface DownloadAssetUseCase extends UseCase<AssetIdInput, DownloadResult | undefined> {}

/**
 * Implementação concreta. Depende só do `AssetService`, injetado via
 * construtor — nunca instancia o Repository nem o StorageAdapter, nunca
 * chama outro Use Case. Nenhuma regra de negócio: só repassa a chamada.
 */
export class DownloadAssetUseCaseImpl implements DownloadAssetUseCase {
  constructor(private readonly assetService: AssetService) {}

  async execute({ assetId }: AssetIdInput): Promise<DownloadResult | undefined> {
    return this.assetService.downloadAsset(assetId);
  }
}
