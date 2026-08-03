import { DownloadResult, StorageMetadata, StorageProvider, UploadResult } from "./types";

/**
 * Storage Adapter — o contrato que toda implementação de armazenamento
 * precisa cumprir (Sprint 1.8, Task 1). Toda comunicação com storage no
 * resto do sistema deve passar por esta interface — nunca por um SDK de
 * provedor específico chamado diretamente de fora de `lib/storage/`.
 *
 * Só o contrato + `LocalStorageAdapter` (dev) existem nesta Task.
 * Adapters reais (`S3StorageAdapter`, `R2StorageAdapter`, etc.) são Tasks
 * futuras — implementar um novo adapter nunca deve exigir mudar esta
 * interface, só escrever uma classe nova que a implemente (ver
 * `lib/storage/README.md`, "Como criar novos adapters").
 *
 * Todo método recebe/devolve tipos de `lib/storage/types.ts` — nenhum
 * método aceita ou devolve nada específico de um provedor (nenhum
 * `Bucket`, nenhum `S3Client`, nenhuma credencial).
 */
export interface StorageAdapter {
  /** Qual provedor esta instância representa — usado por quem chama para saber (e persistir) a origem do arquivo, nunca para ramificar lógica dentro do adapter. */
  readonly provider: StorageProvider;

  /**
   * Grava um arquivo sob `key` (a referência que quem chama escolhe —
   * o adapter não decide nomenclatura/namespacing). Aceita `Buffer`
   * (arquivos pequenos, o caso comum hoje) ou `NodeJS.ReadableStream`
   * (arquivos grandes, para não exigir carregar tudo em memória — nenhum
   * adapter desta Task precisa implementar o caminho de stream de
   * verdade, mas o contrato já suporta).
   *
   * @throws {StorageUploadError} se a escrita falhar.
   * @throws {StoragePermissionError} se `key` não for permitida (ex.: tentativa de escapar do diretório sandboxed).
   */
  upload(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    options?: { contentType?: string; metadata?: StorageMetadata }
  ): Promise<UploadResult>;

  /**
   * Lê o arquivo de `key` por completo.
   *
   * @throws {StorageFileNotFoundError} se `key` não existir.
   * @throws {StorageDownloadError} se a leitura falhar por outro motivo.
   */
  download(key: string): Promise<DownloadResult>;

  /**
   * Remove o arquivo de `key`.
   *
   * @throws {StorageFileNotFoundError} se `key` não existir.
   * @throws {StorageDeleteError} se a remoção falhar por outro motivo.
   */
  delete(key: string): Promise<void>;

  /** Verifica se `key` existe. Nunca lança — `false` cobre tanto "não existe" quanto qualquer ambiguidade de acesso. */
  exists(key: string): Promise<boolean>;

  /**
   * URL pública (sem expiração, sem assinatura) de `key`. Síncrono — é
   * construção determinística de string, nunca I/O. Não garante que o
   * recurso seja de fato acessível (isso depende do provedor estar
   * configurado para acesso público); é a URL que *seria* usada se
   * estivesse.
   */
  getPublicUrl(key: string): string;

  /**
   * URL de download temporária e assinada para `key`, válida por
   * `options.expiresInSeconds` (padrão definido por cada adapter).
   * Assíncrono de propósito: provedores reais (AWS, R2, GCS…) resolvem
   * credenciais/assinam a URL de forma assíncrona.
   *
   * @throws {StorageFileNotFoundError} se `key` não existir.
   */
  getSignedDownloadUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string>;
}
