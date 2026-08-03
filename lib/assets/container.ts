import "server-only";
import { PrismaAssetRepository } from "./prismaAssetRepository";
import { LocalStorageAdapter } from "../storage/localStorageAdapter";
import { AssetService } from "./assetService";
import { CreateAssetUseCaseImpl } from "./use-cases/createAssetUseCase";
import { GetAssetUseCaseImpl } from "./use-cases/getAssetUseCase";
import { ListAssetsUseCaseImpl } from "./use-cases/listAssetsUseCase";
import { UpdateAssetUseCaseImpl } from "./use-cases/updateAssetUseCase";
import { DeleteAssetUseCaseImpl } from "./use-cases/deleteAssetUseCase";
import { UploadAssetUseCaseImpl } from "./use-cases/uploadAssetUseCase";
import { DownloadAssetUseCaseImpl } from "./use-cases/downloadAssetUseCase";
import { DeleteStoredAssetUseCaseImpl } from "./use-cases/deleteStoredAssetUseCase";

/**
 * Composition Root exclusivo do Asset Manager (Sprint 1.7; ganhou o
 * Storage Layer na Sprint 1.8, Task 2) — o **único** lugar do projeto
 * que instancia `PrismaAssetRepository`, `LocalStorageAdapter`,
 * `AssetService` e os Use Cases de Asset. Deliberadamente separado de
 * `lib/application/container.ts` (o Composition Root do Pipeline): os
 * dois módulos não se conhecem, então não faz sentido compartilhar um
 * único ponto de composição — cada um tem o seu.
 *
 *   PrismaAssetRepository -\
 *                           +-> AssetService -> 8 Use Cases (cada um recebendo o mesmo AssetService por injeção)
 *   LocalStorageAdapter   -/
 *
 * `AssetService` só conhece as interfaces `AssetRepository`/
 * `StorageAdapter` — é aqui, e só aqui, que as implementações concretas
 * (`PrismaAssetRepository`, `LocalStorageAdapter`) são escolhidas e
 * injetadas. Trocar de storage (ex.: `LocalStorageAdapter` por um
 * `S3StorageAdapter` futuro) é trocar uma linha aqui, nunca tocar em
 * `AssetService` ou em qualquer Use Case.
 *
 * Nenhuma rota HTTP ou componente consome isto ainda (fora de escopo
 * desta Sprint) — existe para que uma Task futura (rotas de API) só
 * precise importar `assetUseCases` daqui, sem repetir a composição.
 */

const repository = new PrismaAssetRepository();
const storage = new LocalStorageAdapter();

/** Instância composta do Asset Service. Exportada para eventuais consumidores futuros que precisem do Service diretamente. */
export const assetService = new AssetService(repository, storage);

/** Os 8 Use Cases do Asset Manager, cada um montado exatamente uma vez. */
export const assetUseCases = {
  createAsset: new CreateAssetUseCaseImpl(assetService),
  getAsset: new GetAssetUseCaseImpl(assetService),
  listAssets: new ListAssetsUseCaseImpl(assetService),
  updateAsset: new UpdateAssetUseCaseImpl(assetService),
  deleteAsset: new DeleteAssetUseCaseImpl(assetService),
  uploadAsset: new UploadAssetUseCaseImpl(assetService),
  downloadAsset: new DownloadAssetUseCaseImpl(assetService),
  deleteStoredAsset: new DeleteStoredAssetUseCaseImpl(assetService),
};
