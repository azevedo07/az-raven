import { Asset, AssetDomainEvent, AssetDomainEventListener, AssetStatus } from "./types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "./repository";
import { StorageAdapter } from "../storage/storageAdapter";
import { DownloadResult } from "../storage/types";

/**
 * Asset Service — camada de orquestração entre consumidores (Use Cases)
 * e as duas dependências injetadas: `AssetRepository` (persistência de
 * metadados) e `StorageAdapter` (bytes de verdade — Sprint 1.8, Task 2).
 * Mesmo papel que `PipelineService` cumpre para o Pipeline: não conhece
 * Prisma, HTTP, Next.js, React ou componentes — e, crucialmente, não
 * conhece `PrismaAssetRepository` nem `LocalStorageAdapter` (as
 * implementações concretas), só as interfaces `AssetRepository`/
 * `StorageAdapter`. Toda dependência é invertida — quem decide qual
 * implementação usar é o Composition Root (`lib/assets/container.ts`),
 * nunca este arquivo.
 *
 * Fluxo de `uploadAsset`/`downloadAsset`/`deleteStoredAsset`:
 *
 *   Use Case -> AssetService -> StorageAdapter -> Repository
 *
 * O Repository nunca fala com o Storage e o Storage nunca fala com o
 * Repository — só o Service conhece os dois e decide a ordem das
 * chamadas (ver `tests/architecture/asset-layer-boundaries.test.ts`).
 *
 * Diferente do Pipeline, não existe aqui um "Engine" (máquina de estados
 * pura e síncrona) — o ciclo de vida de um Asset (`AssetStatus`) é mais
 * simples e não tem uma cadeia de dependências entre módulos para validar,
 * então as transições de status são só um campo em `UpdateAssetInput`,
 * sem uma camada extra. Se essa validação crescer numa Task futura (ex.:
 * impedir voltar de "DELETED" para "READY"), o lugar certo pra ela é aqui
 * — nunca no Repository, que só persiste o que o Service mandar.
 */
export class AssetService {
  private readonly listeners: AssetDomainEventListener[] = [];

  constructor(
    private readonly repository: AssetRepository,
    private readonly storage: StorageAdapter
  ) {}

  /** Cria um Asset e emite `AssetCreated`. Só o registro — nenhum arquivo é gravado no Storage aqui (isso é `uploadAsset`). */
  async createAsset(input: CreateAssetInput): Promise<Asset> {
    const asset = await this.repository.createAsset(input);
    this.emit({ type: "AssetCreated", assetId: asset.id, projectId: asset.projectId });
    return asset;
  }

  /** Busca um Asset pelo id, ou `undefined` se não existir. Leitura pura, nenhum evento. */
  async getAsset(assetId: string): Promise<Asset | undefined> {
    return this.repository.findAsset(assetId);
  }

  /** Lista os Assets de um projeto. Leitura pura, nenhum evento. */
  async listAssets(projectId: string): Promise<Asset[]> {
    return this.repository.listAssets(projectId);
  }

  /** Atualiza um Asset existente e emite `AssetUpdated` se ele existir. */
  async updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset | undefined> {
    const asset = await this.repository.updateAsset(assetId, input);
    if (asset) {
      this.emit({ type: "AssetUpdated", assetId: asset.id, projectId: asset.projectId });
    }
    return asset;
  }

  /**
   * Remove um Asset (só o registro — ver `deleteStoredAsset` para também
   * remover o arquivo do Storage) e emite `AssetDeleted` se ele existia.
   * Busca o Asset antes de remover só para saber a que projeto ele
   * pertencia (o evento carrega `projectId`) — nenhuma regra de negócio
   * nova, é coordenação.
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.repository.findAsset(assetId);
    await this.repository.deleteAsset(assetId);
    if (asset) {
      this.emit({ type: "AssetDeleted", assetId: asset.id, projectId: asset.projectId });
    }
  }

  /**
   * Envia o conteúdo de um Asset já existente (criado via `createAsset`,
   * ainda "PENDING") para o Storage, e então atualiza o registro para
   * "READY" com o `hash`/`storageKey`/`storageProvider` reais — nessa
   * ordem, de propósito: o Storage grava primeiro, então o Repository só
   * é atualizado depois de o arquivo existir de verdade. Isso garante
   * que o Repository nunca afirme "READY" para um arquivo que não está
   * no Storage.
   *
   * Reaproveita `updateAsset` (nenhuma lógica de persistência+emissão de
   * evento duplicada) para o passo final.
   *
   * Rollback:
   * - Se o **Storage falhar**: nada foi persistido ainda — o Asset é
   *   marcado "FAILED" (melhor esforço) e o erro original é relançado.
   * - Se o **Repository falhar** depois do Storage ter succeeded: o
   *   arquivo que acabou de ser gravado é removido do Storage (melhor
   *   esforço, para não deixar um arquivo órfão sem nenhum registro
   *   apontando pra ele) e o erro original do Repository é relançado.
   *
   * @returns `undefined` se o Asset não existir.
   */
  async uploadAsset(
    assetId: string,
    data: Buffer | NodeJS.ReadableStream,
    options?: { contentType?: string }
  ): Promise<Asset | undefined> {
    const asset = await this.repository.findAsset(assetId);
    if (!asset) {
      return undefined;
    }

    const key = this.buildStorageKey(asset);
    const contentType = options?.contentType ?? asset.mimeType;

    let uploadedKey: string | undefined;
    try {
      const uploaded = await this.storage.upload(key, data, { contentType });
      uploadedKey = uploaded.key;

      return await this.updateAsset(assetId, {
        status: "READY",
        hash: uploaded.checksum,
        storageKey: uploaded.key,
        storageProvider: this.storage.provider,
      });
    } catch (error) {
      if (uploadedKey === undefined) {
        // Falhou no próprio storage.upload() — nada foi persistido, só
        // refletimos a falha no status (melhor esforço).
        await this.tryUpdateStatus(assetId, "FAILED");
      } else {
        // Falhou no updateAsset() (Repository) depois do upload ter
        // funcionado — desfaz o upload para não deixar um arquivo órfão.
        await this.tryDeleteFromStorage(uploadedKey);
      }
      throw error;
    }
  }

  /**
   * Lê o conteúdo do Storage de um Asset já enviado. Leitura pura — não
   * persiste nada nem emite evento (não muda nenhum estado de domínio),
   * mesmo princípio de `getAsset`/`listAssets`.
   *
   * @returns `undefined` se o Asset não existir, ou se existir mas ainda
   * não tiver `storageKey` (nunca terminou de subir — "PENDING"/"UPLOADING"/"FAILED").
   */
  async downloadAsset(assetId: string): Promise<DownloadResult | undefined> {
    const asset = await this.repository.findAsset(assetId);
    if (!asset || !asset.storageKey) {
      return undefined;
    }
    return this.storage.download(asset.storageKey);
  }

  /**
   * Remove tanto o registro (soft delete, via `deleteAsset` — reaproveitado,
   * emite `AssetDeleted`) quanto o arquivo real no Storage.
   *
   * Ordem deliberada: Repository primeiro, Storage depois — o oposto de
   * `uploadAsset`, pelo mesmo motivo (nunca deixar o Repository afirmar
   * "READY" para um arquivo que já não existe). Se o Storage falhar
   * depois do Repository já ter marcado "DELETED", o status é revertido
   * (rollback) e o erro original é relançado — diferente do caminho
   * inverso (Storage não tem "undelete", então não haveria como desfazer
   * uma falha do Repository depois de um delete de Storage bem-sucedido;
   * com esta ordem, essa situação nunca acontece).
   *
   * Idempotente: não faz nada se o Asset não existir (mesmo comportamento
   * de `deleteAsset`).
   */
  async deleteStoredAsset(assetId: string): Promise<void> {
    const asset = await this.repository.findAsset(assetId);
    if (!asset) {
      return;
    }

    const previousStatus = asset.status;
    await this.deleteAsset(assetId);

    if (!asset.storageKey) {
      return; // upload nunca chegou a terminar — nunca houve arquivo de verdade no Storage.
    }

    try {
      await this.storage.delete(asset.storageKey);
    } catch (error) {
      await this.tryUpdateStatus(assetId, previousStatus);
      throw error;
    }
  }

  /**
   * Registra um observador de eventos de domínio do Asset Manager.
   * Mesmo padrão de `PipelineEngine.subscribe` — nenhuma integração com
   * a Timeline do Pipeline ainda (fora de escopo desta Sprint), mas o
   * mecanismo já existe para um consumidor futuro (histórico, auditoria,
   * notificações) se inscrever sem exigir mudança neste arquivo.
   */
  subscribe(listener: AssetDomainEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emit(event: AssetDomainEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Namespacing determinístico por projeto+asset — o Storage não decide isso, o Service decide. */
  private buildStorageKey(asset: Asset): string {
    return `assets/${asset.projectId}/${asset.id}.${asset.extension}`;
  }

  /** Melhor esforço: usado só dentro de um `catch` que já vai relançar o erro original. */
  private async tryUpdateStatus(assetId: string, status: AssetStatus): Promise<void> {
    try {
      await this.repository.updateAsset(assetId, { status });
    } catch {
      // Intencional — ver docstring de uploadAsset/deleteStoredAsset.
    }
  }

  /** Melhor esforço: usado só dentro de um `catch` que já vai relançar o erro original. */
  private async tryDeleteFromStorage(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch {
      // Intencional — ver docstring de uploadAsset.
    }
  }
}
