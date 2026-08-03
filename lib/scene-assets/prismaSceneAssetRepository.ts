import "server-only";
import { prisma } from "../db/client";
import { SceneAsset, SceneAssetRole } from "./types";
import { AttachAssetInput, SceneAssetRepository } from "./repository";
import { SceneAssetAlreadyLinkedError } from "./errors";

/**
 * Implementação Prisma do `SceneAssetRepository` (Sprint 2.0). Único
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
      const created = await prisma.sceneAsset.create({
        data: { sceneId: input.sceneId, assetId: input.assetId, role: input.role },
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

  async listBySceneId(sceneId: string): Promise<SceneAsset[]> {
    const rows = await prisma.sceneAsset.findMany({
      where: { sceneId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async updateRole(id: string, role: SceneAssetRole): Promise<SceneAsset | undefined> {
    try {
      const updated = await prisma.sceneAsset.update({ where: { id }, data: { role } });
      return this.toDomain(updated);
    } catch (error) {
      if (this.isNotFound(error)) {
        return undefined;
      }
      if (this.isUniqueConstraintViolation(error)) {
        const existing = await prisma.sceneAsset.findUnique({ where: { id } });
        throw new SceneAssetAlreadyLinkedError(existing?.sceneId ?? "?", existing?.assetId ?? "?", role);
      }
      throw error;
    }
  }

  private toDomain(row: {
    id: string;
    sceneId: string;
    assetId: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): SceneAsset {
    return {
      id: row.id,
      sceneId: row.sceneId,
      assetId: row.assetId,
      role: row.role as SceneAssetRole,
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
