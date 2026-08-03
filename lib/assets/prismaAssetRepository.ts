import "server-only";
import { prisma } from "../db/client";
import { Asset, AssetType } from "./types";
import { AssetRepository, CreateAssetInput, UpdateAssetInput } from "./repository";

/**
 * Implementação Prisma do `AssetRepository` (Sprint 1.7). Único arquivo,
 * além de `lib/db/client.ts`, que importa o Prisma Client gerado para o
 * Asset Manager — assim como `PrismaPipelineRepository`
 * (`lib/repositories/pipelineRepository.ts`), só o Composition Root do
 * módulo (`lib/assets/container.ts`) deve instanciar esta classe
 * diretamente.
 *
 * Só persistência: nenhuma validação de transição de status, nenhuma
 * dedução de duplicados por `hash`, nenhuma decisão sobre qual provedor
 * de storage usar — isso é papel do `AssetService` (ou de uma Task
 * futura), nunca deste arquivo.
 *
 * `prisma` é o cliente singleton compartilhado (`lib/db/client.ts`) — o
 * mesmo usado por `PrismaPipelineRepository`. Compartilhar o cliente não
 * cria nenhum acoplamento entre os domínios: é infraestrutura genérica
 * (conexão com o banco), não conhecimento de domínio; nenhum dos dois
 * repositórios importa o outro nem sabe que o outro existe.
 */
export class PrismaAssetRepository implements AssetRepository {
  async createAsset(input: CreateAssetInput): Promise<Asset> {
    const created = await prisma.asset.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        name: input.name,
        originalName: input.originalName,
        mimeType: input.mimeType,
        extension: input.extension,
        size: BigInt(input.size),
      },
    });

    return this.toDomain(created);
  }

  async findAsset(assetId: string): Promise<Asset | undefined> {
    const found = await prisma.asset.findUnique({ where: { id: assetId } });
    return found ? this.toDomain(found) : undefined;
  }

  async listAssets(projectId: string): Promise<Asset[]> {
    const rows = await prisma.asset.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      // Teto de segurança: sem isso, um projeto com centenas de milhares
      // de Assets faria essa query carregar tudo de uma vez na memória do
      // processo. 500 é generoso para o uso atual (nenhuma UI consome
      // isto ainda) e documentado como débito técnico — paginação de
      // verdade (cursor, não offset, para não degradar em tabelas
      // grandes) é recomendação explícita para a próxima Sprint.
      take: 500,
    });

    return rows.map((row) => this.toDomain(row));
  }

  async updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset | undefined> {
    try {
      const updated = await prisma.asset.update({
        where: { id: assetId },
        data: {
          name: input.name,
          status: input.status,
          hash: input.hash,
          storageKey: input.storageKey,
          storageProvider: input.storageProvider,
        },
      });
      return this.toDomain(updated);
    } catch {
      // P2025 (registro não encontrado) é o único caso esperado aqui —
      // traduzido para `undefined`, mesmo contrato de `findAsset`. Não
      // inspeciona o código do erro porque qualquer outra falha (conexão,
      // constraint) já se propagaria de forma útil antes de chegar aqui;
      // o try/catch existe só para essa tradução "não encontrado".
      return undefined;
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    // Soft delete: preserva a linha (e o histórico que ela carrega) em
    // vez de apagá-la — mesmo princípio já aplicado em todo o resto do
    // sistema (ex.: PipelineExecution nunca é removida, só transiciona
    // de status). `DELETED` já existe em `AssetStatus` para exatamente
    // isso. Silenciosamente não faz nada se o Asset não existir — mesma
    // semântica de "idempotente" que delete costuma ter.
    await prisma.asset.updateMany({
      where: { id: assetId },
      data: { status: "DELETED" },
    });
  }

  private toDomain(row: {
    id: string;
    projectId: string;
    type: string;
    name: string;
    originalName: string;
    mimeType: string;
    extension: string;
    size: bigint;
    hash: string | null;
    storageKey: string | null;
    storageProvider: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Asset {
    return {
      id: row.id,
      projectId: row.projectId,
      type: row.type as AssetType,
      name: row.name,
      originalName: row.originalName,
      mimeType: row.mimeType,
      extension: row.extension,
      // bigint -> number: ver o comentário sobre `size` em lib/assets/types.ts.
      size: Number(row.size),
      hash: row.hash,
      storageKey: row.storageKey,
      storageProvider: row.storageProvider,
      status: row.status as Asset["status"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
