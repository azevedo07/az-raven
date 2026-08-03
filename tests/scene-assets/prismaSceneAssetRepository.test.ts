import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaSceneAssetRepository } from "../../lib/scene-assets/prismaSceneAssetRepository";
import { PrismaAssetRepository } from "../../lib/assets/prismaAssetRepository";
import { SceneAssetAlreadyLinkedError } from "../../lib/scene-assets/errors";
import { prisma } from "../../lib/db/client";

/**
 * Teste de integração do `PrismaSceneAssetRepository` — contra o
 * PostgreSQL real, sem mocks (mesmo princípio de
 * `tests/assets/prismaAssetRepository.test.ts`). Usa `PrismaAssetRepository`
 * de verdade para criar os Assets que os vínculos referenciam (a FK real
 * exige que existam).
 */
describe("PrismaSceneAssetRepository (integração)", () => {
  const TEST_EMAIL = "temp-scene-asset-repo-test@example.com";
  let projectId: string;
  let assetId: string;
  let secondAssetId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP scene-asset repo", ownerId: user.id } });
    projectId = project.id;

    const assetRepository = new PrismaAssetRepository();
    const asset = await assetRepository.createAsset({
      projectId,
      type: "image",
      name: "referencia.png",
      originalName: "referencia.png",
      mimeType: "image/png",
      extension: "png",
      size: 1024,
    });
    assetId = asset.id;

    const secondAsset = await assetRepository.createAsset({
      projectId,
      type: "audio",
      name: "trilha.mp3",
      originalName: "trilha.mp3",
      mimeType: "audio/mpeg",
      extension: "mp3",
      size: 2048,
    });
    secondAssetId = secondAsset.id;
  });

  afterAll(async () => {
    await prisma.sceneAsset.deleteMany({ where: { assetId: { in: [assetId, secondAssetId] } } });
    await prisma.asset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  it("cria um vínculo real no Postgres", async () => {
    const repository = new PrismaSceneAssetRepository();

    const sceneAsset = await repository.attach({ sceneId: "1", assetId, role: "REFERENCE_IMAGE" });

    expect(sceneAsset.id).toBeTruthy();
    expect(sceneAsset.sceneId).toBe("1");
    expect(sceneAsset.assetId).toBe(assetId);
    expect(sceneAsset.role).toBe("REFERENCE_IMAGE");
    expect(sceneAsset.createdAt).toBeInstanceOf(Date);

    await repository.detach(sceneAsset.id);
  });

  it("lança SceneAssetAlreadyLinkedError ao violar a constraint única (sceneId, assetId, role)", async () => {
    const repository = new PrismaSceneAssetRepository();
    const first = await repository.attach({ sceneId: "2", assetId, role: "MUSIC" });

    await expect(repository.attach({ sceneId: "2", assetId, role: "MUSIC" })).rejects.toThrow(
      SceneAssetAlreadyLinkedError
    );

    await repository.detach(first.id);
  });

  it("lista os vínculos de uma cena, em ordem de criação", async () => {
    const repository = new PrismaSceneAssetRepository();
    const first = await repository.attach({ sceneId: "3", assetId, role: "REFERENCE_IMAGE" });
    const second = await repository.attach({ sceneId: "3", assetId: secondAssetId, role: "MUSIC" });

    const list = await repository.listBySceneId("3");

    expect(list.map((r) => r.id)).toEqual([first.id, second.id]);

    await repository.detach(first.id);
    await repository.detach(second.id);
  });

  it("retorna lista vazia para uma cena sem vínculos", async () => {
    const repository = new PrismaSceneAssetRepository();
    expect(await repository.listBySceneId("cena-sem-vinculos-de-verdade")).toEqual([]);
  });

  it("findById encontra um vínculo existente e retorna undefined para um id inexistente", async () => {
    const repository = new PrismaSceneAssetRepository();
    const created = await repository.attach({ sceneId: "4", assetId, role: "DOCUMENT" });

    expect(await repository.findById(created.id)).toMatchObject({ id: created.id, role: "DOCUMENT" });
    expect(await repository.findById("scene-asset-fantasma")).toBeUndefined();

    await repository.detach(created.id);
  });

  it("atualiza o papel de um vínculo existente", async () => {
    const repository = new PrismaSceneAssetRepository();
    const created = await repository.attach({ sceneId: "5", assetId, role: "PROMPT" });

    const updated = await repository.updateRole(created.id, "TEXTURE");

    expect(updated?.role).toBe("TEXTURE");
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());

    await repository.detach(created.id);
  });

  it("updateRole retorna undefined para um vínculo inexistente", async () => {
    const repository = new PrismaSceneAssetRepository();
    expect(await repository.updateRole("scene-asset-fantasma", "TEXTURE")).toBeUndefined();
  });

  it("updateRole lança SceneAssetAlreadyLinkedError se o novo papel colidir com outro vínculo já existente", async () => {
    const repository = new PrismaSceneAssetRepository();
    const a = await repository.attach({ sceneId: "6", assetId, role: "REFERENCE_IMAGE" });
    const b = await repository.attach({ sceneId: "6", assetId, role: "CONCEPT_ART" });

    await expect(repository.updateRole(b.id, "REFERENCE_IMAGE")).rejects.toThrow(SceneAssetAlreadyLinkedError);

    await repository.detach(a.id);
    await repository.detach(b.id);
  });

  it("detach é idempotente — não lança para um id inexistente", async () => {
    const repository = new PrismaSceneAssetRepository();
    await expect(repository.detach("scene-asset-fantasma")).resolves.toBeUndefined();
  });
});
