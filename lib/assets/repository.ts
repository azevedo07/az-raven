import { Asset, AssetStatus, AssetType } from "./types";

/**
 * Asset Repository — contrato de persistência (Sprint 1.6, Task 1;
 * implementação real — `PrismaAssetRepository` — chegou na Sprint 1.7).
 *
 * Mesmo princípio do `PipelineRepository` (`lib/repositories/types.ts`):
 * o Service depende só desta interface, nunca de uma implementação
 * concreta diretamente — troca de mecanismo de persistência não deve
 * exigir tocar em Service, Use Cases ou UI.
 */

/**
 * Dados necessários para criar um Asset. Deliberadamente não inclui
 * `id`/`createdAt`/`updatedAt` (gerados pela persistência) nem
 * `hash`/`storageKey`/`status` (populados progressivamente conforme o
 * ciclo de vida avança — ver `AssetStatus` em `types.ts`); um Asset
 * recém-criado nasce "PENDING", sem hash e sem storageKey ainda.
 */
export interface CreateAssetInput {
  projectId: string;
  type: AssetType;
  name: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
}

/**
 * Dados que podem ser atualizados num Asset existente. Todos opcionais —
 * quem chama informa só o que mudou (ex.: só `status` ao avançar de
 * "UPLOADING" para "READY", só `hash`+`storageKey`+`storageProvider`
 * quando o upload termina). `projectId`, `type`, `originalName`,
 * `mimeType`, `extension` e `size` não aparecem aqui de propósito: são
 * propriedades do arquivo físico original, não do registro — não fazem
 * sentido "atualizados" sem trocar o arquivo inteiro (isso seria criar um
 * novo Asset).
 */
export interface UpdateAssetInput {
  name?: string;
  status?: AssetStatus;
  hash?: string | null;
  storageKey?: string | null;
  storageProvider?: string | null;
}

/**
 * Contrato de persistência do Asset Manager. Implementado por uma Task
 * futura (Prisma ou outro mecanismo); consumido exclusivamente pelo
 * `AssetService` — nenhum Use Case, rota de API ou componente de UI deve
 * depender desta interface diretamente (mesma disciplina do Pipeline).
 */
export interface AssetRepository {
  /** Cria um novo Asset (status inicial "PENDING") e devolve o registro completo. */
  createAsset(input: CreateAssetInput): Promise<Asset>;

  /** Busca um Asset pelo id, ou `undefined` se não existir. */
  findAsset(assetId: string): Promise<Asset | undefined>;

  /** Lista os Assets de um projeto. Nenhum filtro por status aqui — isso é decisão de quem chama (Service/Use Case), não do Repository. */
  listAssets(projectId: string): Promise<Asset[]>;

  /** Atualiza campos parciais de um Asset existente; `undefined` se o Asset não existir. */
  updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset | undefined>;

  /**
   * Remove um Asset. `DELETED` já é um status de primeira classe em
   * `AssetStatus` — o que sugere fortemente que uma implementação real
   * deste método deveria fazer soft delete (marcar `status: "DELETED"`),
   * não apagar a linha, para preservar histórico/auditoria (o mesmo
   * princípio já aplicado em todo o resto do sistema: nada é destruído
   * silenciosamente). Esta interface não impõe isso — é uma decisão de
   * implementação, documentada aqui para quem for escrevê-la.
   */
  deleteAsset(assetId: string): Promise<void>;
}
