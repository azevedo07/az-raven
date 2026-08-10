import "server-only";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../db/client";
import { SceneAsset } from "./types";
import { AttachAssetInput, SceneAssetRepository, UpdateSceneAssetInput } from "./repository";
import { SceneAssetAlreadyLinkedError } from "./errors";

/**
 * Converte `metadata` (`Record<string, unknown> | null | undefined`, no
 * domínio) para o formato que o Prisma exige em `Json?`: `null` puro é
 * ambíguo para o Prisma (poderia significar "não mexer" ou "gravar NULL
 * no banco"), então um `null` explícito precisa de `Prisma.JsonNull`,
 * não do `null` do JavaScript.
 */
function toPrismaJson(metadata: Record<string, unknown> | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue);
}

/**
 * Implementação Prisma do `SceneAssetRepository` (Sprint 2.0; `order`
 * e `metadata` adicionados na Task "Scene Asset Binding"). Único
 * arquivo, além de `lib/db/client.ts`, que importa o Prisma Client para
 * o Asset Binding Engine — só o Composition Root do módulo
 * (`lib/scene-assets/container.ts`) deve instanciar esta classe.
 *
 * Nunca importa `lib/assets/` — o Repository não sabe (nem precisa
 * saber) que o Asset existe de verdade; isso é papel do
 * `SceneAssetService`, que tem o `AssetService` injetado.
 */
export class PrismaSceneAssetRepository implements SceneAssetRepository {
  async attach(input: AttachAssetInput): Promise<SceneAsset> {
    try {
      const order = input.order ?? (await this.nextOrder(input.sceneId));
      const created = await prisma.sceneAsset.create({
        data: {
          sceneId: input.sceneId,
          assetId: input.assetId,
          role: input.role,
          order,
          ...(input.metadata !== undefined ? { metadata: toPrismaJson(input.metadata) } : {}),
        },
      });
      return this.toDomain(created);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new SceneAssetAlreadyLinkedError(input.sceneId, input.assetId, input.role);
      }
      throw error;
    }
  }

  async detach(id: string): Promise<void> {
    await prisma.sceneAsset.deleteMany({ where: { id } });
  }

  async findById(id: string): Promise<SceneAsset | undefined> {
    const found = await prisma.sceneAsset.findUnique({ where: { id } });
    return found ? this.toDomain(found) : undefined;
  }

  /** Ordenado por `order` — desempate por `createdAt` para vínculos com o mesmo `order` (ex.: todos criados com o padrão 0, antes de qualquer PATCH explícito). */
  async listBySceneId(sceneId: string): Promise<SceneAsset[]> {
    const rows = await prisma.sceneAsset.findMany({
      where: { sceneId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, input: UpdateSceneAssetInput): Promise<SceneAsset | undefined> {
    try {
      const updated = await prisma.sceneAsset.update({
        where: { id },
        data: {
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
          ...(input.metadata !== undefined ? { metadata: toPrismaJson(input.metadata) } : {}),
        },
      });
      return this.toDomain(updated);
    } catch (error) {
      if (this.isNotFound(error)) {
        return undefined;
      }
      if (this.isUniqueConstraintViolation(error)) {
        const existing = await prisma.sceneAsset.findUnique({ where: { id } });
        throw new SceneAssetAlreadyLinkedError(
          existing?.sceneId ?? "?",
          existing?.assetId ?? "?",
          input.role ?? existing?.role ?? "?"
        );
      }
      throw error;
    }
  }

  /** Anexa ao final da cena: maior `order` já usado + 1 (0 se a cena ainda não tem nenhum vínculo). */
  private async nextOrder(sceneId: string): Promise<number> {
    const result = await prisma.sceneAsset.aggregate({
      where: { sceneId },
      _max: { order: true },
    });
    return (result._max.order ?? -1) + 1;
  }

  private toDomain(row: {
    id: string;
    sceneId: string;
    assetId: string;
    role: string;
    order: number;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): SceneAsset {
    return {
      id: row.id,
      sceneId: row.sceneId,
      assetId: row.assetId,
      role: row.role,
      order: row.order,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
  }

  private isNotFound(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025";
  }
}
