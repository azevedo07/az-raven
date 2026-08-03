/**
 * Storage Layer — contratos de tipo (Sprint 1.8, Task 1).
 *
 * Fundação de armazenamento do Raven Studio, independente de qualquer
 * provedor concreto (AWS S3, Cloudflare R2, MinIO, Google Cloud, Azure,
 * Backblaze) e independente do resto do sistema (Pipeline, Asset
 * Manager). Nenhum tipo aqui importa nada de fora de `lib/storage/`.
 *
 * Este módulo não sabe o que está guardando — não conhece `Asset`, não
 * conhece `projectId`, não conhece regra de negócio nenhuma. Só sabe
 * mover bytes de/para um `key` (uma string opaca que quem chama escolhe)
 * através de um provedor.
 */

/**
 * Provedores de storage suportados pela arquitetura — mesmo que só
 * `LOCAL` tenha um adapter implementado nesta Task. Adicionar um
 * provedor novo no futuro (ex.: um `StorageProvider` que ainda nem foi
 * inventado) é só acrescentar um valor aqui, nunca uma mudança de
 * contrato em `StorageAdapter`.
 */
export type StorageProvider =
  | "LOCAL"
  | "AWS_S3"
  | "CLOUDFLARE_R2"
  | "MINIO"
  | "GOOGLE_CLOUD"
  | "AZURE"
  | "BACKBLAZE";

/**
 * Metadados descritivos de um arquivo, independentes do provedor que o
 * guarda. `custom` existe para que uma camada futura (ex.: o Asset
 * Manager) possa anexar pares chave/valor arbitrários sem que o Storage
 * precise conhecer o que eles significam.
 */
export interface StorageMetadata {
  contentType?: string;
  custom?: Record<string, string>;
}

/**
 * Registro canônico de um arquivo já armazenado — a forma comum que
 * `UploadResult` e `DownloadResult` compartilham (ver abaixo). Não
 * carrega o conteúdo do arquivo, só o que descreve onde e o que ele é.
 */
export interface StorageFile {
  /** Referência opaca do arquivo dentro do provedor — não é um caminho de disco nem uma URL. */
  key: string;
  provider: StorageProvider;
  contentType: string;
  /** Tamanho em bytes. `number`, não `bigint` — mesma decisão já tomada em `lib/assets/types.ts`: nenhum arquivo real chega perto de `Number.MAX_SAFE_INTEGER` bytes. */
  size: number;
  /** Hash de conteúdo (sha256), calculado pelo adapter no momento do upload. */
  checksum: string;
  metadata?: StorageMetadata;
  createdAt: Date;
}

/** O que `StorageAdapter.upload()` devolve — hoje é exatamente um `StorageFile`, sem campos extra. */
export interface UploadResult extends StorageFile {}

/** O que `StorageAdapter.download()` devolve — um `StorageFile` mais o conteúdo em si. */
export interface DownloadResult extends StorageFile {
  data: Buffer;
}
