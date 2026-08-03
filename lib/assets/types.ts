/**
 * Asset Domain — contratos de tipo (Sprint 1.6 Task 1; persistência real
 * chegou na Sprint 1.7).
 *
 * Fundação arquitetural do Asset Manager (futura base do AZ Vault). Este
 * arquivo é agnóstico de apresentação e de armazenamento — assim como
 * `lib/pipeline-core/types.ts` não sabe nada de Prisma, este não sabe
 * nada de S3, Cloudflare R2, MinIO, Google Cloud Storage, Backblaze ou
 * disco local. Um `Asset` guarda só `storageKey`+`storageProvider`:
 * referências opacas para onde quer que o arquivo esteja fisicamente —
 * qual adapter resolve essa chave é uma decisão de infraestrutura
 * completamente fora do domínio, e chega numa Task futura (upload/storage),
 * sem exigir nenhuma mudança neste arquivo.
 *
 * Este módulo é deliberadamente independente do Pipeline (`lib/pipeline-core/`,
 * `lib/repositories/`, `lib/pipeline-service/`, `lib/application/`) — não
 * importa nada de lá, e nada de lá importa daqui. São dois domínios do
 * mesmo produto, não uma extensão um do outro.
 */

/**
 * Categoria do arquivo representado pelo Asset. Um recorte inicial e
 * deliberadamente pequeno — o suficiente para diferenciar como a futura
 * UI deve tratar cada um (preview de imagem vs. player de vídeo/áudio,
 * por exemplo), sem amarrar o domínio a nenhum formato específico.
 */
export type AssetType = "image" | "video" | "audio" | "document" | "other";

/**
 * Ciclo de vida de um Asset. Modelado como uma progressão porque o
 * arquivo físico normalmente não existe ainda no instante em que o
 * registro é criado (ex.: upload assíncrono/multipart) — `hash` e
 * `storageKey` só ficam definitivos quando o status chega a "READY".
 *
 *   PENDING -> UPLOADING -> READY
 *                    \-> FAILED
 *   qualquer estado -> DELETED (soft delete — ver AssetRepository.deleteAsset)
 */
export type AssetStatus = "PENDING" | "UPLOADING" | "READY" | "FAILED" | "DELETED";

/**
 * Entidade de domínio Asset — independente de qualquer mecanismo de
 * persistência ou armazenamento físico. Espelhada pelo model `Asset` do
 * Prisma (Sprint 1.7, `prisma/schema.prisma`), mas não depende dele: é o
 * formato que o domínio usa internamente, que `PrismaAssetRepository`
 * traduz a partir das linhas do banco.
 *
 * `size` continua `number`, não `bigint` (a coluna no Postgres é BigInt,
 * de propósito — ver comentário do model no schema): nenhum arquivo real
 * chega perto de `Number.MAX_SAFE_INTEGER` bytes (~9 mil TB), então a
 * conversão bigint -> number na fronteira do Repository é segura e evita
 * espalhar `bigint` (com toda a fricção de serialização em JSON que ele
 * traz) pelo resto do domínio sem necessidade real.
 */
export interface Asset {
  id: string;
  projectId: string;
  type: AssetType;
  name: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  /** Hash de conteúdo (ex.: sha256), usado para deduplicação futura. Ausente até o arquivo terminar de chegar. */
  hash: string | null;
  /** Referência opaca para o adapter de armazenamento resolver — nunca um caminho ou URL concreto. Ausente até "READY". */
  storageKey: string | null;
  /**
   * Qual provedor de storage resolve `storageKey` (ex.: "s3", "r2",
   * "minio", "gcs", "backblaze", "local") — string livre, não union
   * fechada: suportar um provedor novo é só passar um valor novo aqui,
   * nunca uma migration ou uma mudança de tipo (Sprint 1.7). Ausente até
   * "READY", pelo mesmo motivo de `storageKey`.
   */
  storageProvider: string | null;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Evento de domínio do Asset Manager — deliberadamente um tipo separado
 * de `PipelineEngineEvent`/`PipelineEventRecord` (`lib/pipeline-core/types.ts`,
 * `lib/repositories/types.ts`), que permanecem intocados nesta Task.
 * Nenhuma integração com a Timeline do Pipeline ainda — isso é uma
 * decisão explícita desta Sprint, não uma limitação técnica: o
 * `AssetService` já emite estes eventos (ver `subscribe()`), prontos
 * para um consumidor futuro (histórico de Assets, notificações, auditoria)
 * se inscrever, sem precisar tocar neste arquivo.
 */
export type AssetDomainEvent =
  | { type: "AssetCreated"; assetId: string; projectId: string }
  | { type: "AssetUpdated"; assetId: string; projectId: string }
  | { type: "AssetDeleted"; assetId: string; projectId: string };

/** Assinatura de um observador registrado via `AssetService.subscribe`. */
export type AssetDomainEventListener = (event: AssetDomainEvent) => void;
