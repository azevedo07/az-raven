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
    expect(sceneAsset.order).toBe(0);
    expect(sceneAsset.metadata).toBeNull();
    expect(sceneAsset.createdAt).toBeInstanceOf(Date);

    await repository.detach(sceneAsset.id);
  });

  it("aceita um role fora do vocabulário sugerido — String livre, não enum de banco", async () => {
    const repository = new PrismaSceneAssetRepository();

    const sceneAsset = await repository.attach({ sceneId: "1", assetId, role: "PAPEL_INVENTADO_PELO_TESTE" });

    expect(sceneAsset.role).toBe("PAPEL_INVENTADO_PELO_TESTE");

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

  it("permite a mesma combinação (sceneId, assetId) com um role diferente — não é considerado duplicado", async () => {
    const repository = new PrismaSceneAssetRepository();
    const first = await repository.attach({ sceneId: "2b", assetId, role: "REFERENCE_IMAGE" });
    const second = await repository.attach({ sceneId: "2b", assetId, role: "CONCEPT_ART" });

    expect(second.id).not.toBe(first.id);

    await repository.detach(first.id);
    await repository.detach(second.id);
  });

  it("lista os vínculos de uma cena, ordenados por order (padrão: ordem de criação)", async () => {
    const repository = new PrismaSceneAssetRepository();
    const first = await repository.attach({ sceneId: "3", assetId, role: "REFERENCE_IMAGE" });
    const second = await repository.attach({ sceneId: "3", assetId: secondAssetId, role: "MUSIC" });

    const list = await repository.listBySceneId("3");

    expect(list.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(list.map((r) => r.order)).toEqual([0, 1]);

    await repository.detach(first.id);
    await repository.detach(second.id);
  });

  it("respeita um order explícito na listagem, mesmo fora da ordem de criação", async () => {
    const repository = new PrismaSceneAssetRepository();
    const criadoPrimeiro = await repository.attach({ sceneId: "3b", assetId, role: "REFERENCE_IMAGE", order: 5 });
    const criadoSegundo = await repository.attach({ sceneId: "3b", assetId: secondAssetId, role: "MUSIC", order: 1 });

    const list = await repository.listBySceneId("3b");

    expect(list.map((r) => r.id)).toEqual([criadoSegundo.id, criadoPrimeiro.id]);

    await repository.detach(criadoPrimeiro.id);
    await repository.detach(criadoSegundo.id);
  });

  it("persiste metadata livre e devolve null quando não informada", async () => {
    const repository = new PrismaSceneAssetRepository();
    const withMetadata = await repository.attach({
      sceneId: "3c",
      assetId,
      role: "REFERENCE_IMAGE",
      metadata: { nota: "plano aberto" },
    });
    const withoutMetadata = await repository.attach({ sceneId: "3c", assetId: secondAssetId, role: "MUSIC" });

    expect(withMetadata.metadata).toEqual({ nota: "plano aberto" });
    expect(withoutMetadata.metadata).toBeNull();

    await repository.detach(withMetadata.id);
    await repository.detach(withoutMetadata.id);
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

    const updated = await repository.update(created.id, { role: "TEXTURE" });

    expect(updated?.role).toBe("TEXTURE");
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());

    await repository.detach(created.id);
  });

  it("atualiza order e metadata sem exigir role", async () => {
    const repository = new PrismaSceneAssetRepository();
    const created = await repository.attach({ sceneId: "5b", assetId, role: "PROMPT" });

    const updated = await repository.update(created.id, { order: 9, metadata: { revisado: true } });

    expect(updated?.role).toBe("PROMPT");
    expect(updated?.order).toBe(9);
    expect(updated?.metadata).toEqual({ revisado: true });

    await repository.detach(created.id);
  });

  it("update retorna undefined para um vínculo inexistente", async () => {
    const repository = new PrismaSceneAssetRepository();
    expect(await repository.update("scene-asset-fantasma", { role: "TEXTURE" })).toBeUndefined();
  });

  it("update lança SceneAssetAlreadyLinkedError se a mudança de papel colidir com outro vínculo já existente", async () => {
    const repository = new PrismaSceneAssetRepository();
    const a = await repository.attach({ sceneId: "6", assetId, role: "REFERENCE_IMAGE" });
    const b = await repository.attach({ sceneId: "6", assetId, role: "CONCEPT_ART" });

    await expect(repository.update(b.id, { role: "REFERENCE_IMAGE" })).rejects.toThrow(SceneAssetAlreadyLinkedError);

    await repository.detach(a.id);
    await repository.detach(b.id);
  });

  it("detach é idempotente — não lança para um id inexistente", async () => {
    const repository = new PrismaSceneAssetRepository();
    await expect(repository.detach("scene-asset-fantasma")).resolves.toBeUndefined();
  });

  it("detach remove só o vínculo — o Asset referenciado continua existindo no Postgres", async () => {
    const repository = new PrismaSceneAssetRepository();
    const created = await repository.attach({ sceneId: "7", assetId, role: "REFERENCE_IMAGE" });

    await repository.detach(created.id);

    const assetStillExists = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(assetStillExists).not.toBeNull();
    expect(assetStillExists?.status).not.toBe("DELETED");
  });
});
