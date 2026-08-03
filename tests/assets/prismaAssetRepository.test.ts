import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaAssetRepository } from "../../lib/assets/prismaAssetRepository";
import { CreateAssetInput } from "../../lib/assets/repository";
import { prisma } from "../../lib/db/client";

/**
 * Teste de integração do `PrismaAssetRepository` — contra o PostgreSQL
 * real, sem mocks (Sprint 1.7, item 4). Mesma técnica dos testes de
 * integração do Pipeline: Project/User de teste criados e removidos ao
 * final, sem resíduo.
 */
describe("PrismaAssetRepository (integração)", () => {
  const TEST_EMAIL = "temp-asset-repo-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP asset repo", ownerId: user.id } });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  function buildCreateInput(overrides: Partial<CreateAssetInput> = {}): CreateAssetInput {
    return {
      projectId,
      type: "image",
      name: "poster-final.png",
      originalName: "poster (1).png",
      mimeType: "image/png",
      extension: "png",
      size: 204_800,
      ...overrides,
    };
  }

  it("cria um Asset real no Postgres com status inicial PENDING e campos progressivos nulos", async () => {
    const repository = new PrismaAssetRepository();

    const asset = await repository.createAsset(buildCreateInput());

    expect(asset.id).toBeTruthy();
    expect(asset.projectId).toBe(projectId);
    expect(asset.status).toBe("PENDING");
    expect(asset.hash).toBeNull();
    expect(asset.storageKey).toBeNull();
    expect(asset.storageProvider).toBeNull();
    expect(asset.createdAt).toBeInstanceOf(Date);
    expect(asset.updatedAt).toBeInstanceOf(Date);

    const row = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(row.size).toBe(BigInt(204_800)); // confirma que a coluna é BigInt de verdade.
  });

  it("suporta um arquivo maior que o teto de um Int de 32 bits (>2GB) sem estourar", async () => {
    const repository = new PrismaAssetRepository();
    const fiveGigabytes = 5 * 1024 * 1024 * 1024; // 5 368 709 120 — não cabe num Int Postgres (máx. ~2.1 bilhões).

    const asset = await repository.createAsset(buildCreateInput({ name: "render-8k.mov", size: fiveGigabytes }));

    expect(asset.size).toBe(fiveGigabytes);
  });

  it("busca um Asset existente e retorna undefined para um id desconhecido", async () => {
    const repository = new PrismaAssetRepository();
    const created = await repository.createAsset(buildCreateInput());

    const found = await repository.findAsset(created.id);
    expect(found).toEqual(created);

    expect(await repository.findAsset("asset-que-nao-existe-de-verdade")).toBeUndefined();
  });

  it("lista os Assets do projeto, mais recente primeiro", async () => {
    const repository = new PrismaAssetRepository();
    const first = await repository.createAsset(buildCreateInput({ name: "a.png" }));
    const second = await repository.createAsset(buildCreateInput({ name: "b.png" }));

    const assets = await repository.listAssets(projectId);

    const ids = assets.map((a) => a.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    expect(assets.every((a) => a.projectId === projectId)).toBe(true);
  });

  it("atualiza campos parciais (status, hash, storageKey, storageProvider) sem tocar nos demais", async () => {
    const repository = new PrismaAssetRepository();
    const created = await repository.createAsset(buildCreateInput());

    const updated = await repository.updateAsset(created.id, {
      status: "READY",
      hash: "sha256:abc123",
      storageKey: `assets/${projectId}/abc123.png`,
      storageProvider: "s3",
    });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("READY");
    expect(updated!.hash).toBe("sha256:abc123");
    expect(updated!.storageKey).toBe(`assets/${projectId}/abc123.png`);
    expect(updated!.storageProvider).toBe("s3");
    // Campos não tocados permanecem os mesmos.
    expect(updated!.name).toBe(created.name);
    expect(updated!.size).toBe(created.size);
  });

  it("retorna undefined ao tentar atualizar um Asset inexistente", async () => {
    const repository = new PrismaAssetRepository();

    const result = await repository.updateAsset("asset-que-nao-existe-de-verdade", { status: "READY" });

    expect(result).toBeUndefined();
  });

  it("deleteAsset faz soft delete — a linha permanece, só o status muda para DELETED", async () => {
    const repository = new PrismaAssetRepository();
    const created = await repository.createAsset(buildCreateInput());

    await repository.deleteAsset(created.id);

    const row = await prisma.asset.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
    expect(row!.status).toBe("DELETED");

    const found = await repository.findAsset(created.id);
    expect(found?.status).toBe("DELETED");
  });

  it("deleteAsset não lança erro ao ser chamado para um Asset inexistente (idempotente)", async () => {
    const repository = new PrismaAssetRepository();
    await expect(repository.deleteAsset("asset-que-nao-existe-de-verdade")).resolves.toBeUndefined();
  });
});
