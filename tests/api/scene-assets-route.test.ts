import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as postSceneAsset, GET as listSceneAssets } from "../../app/api/scene-assets/route";
import { PATCH as patchSceneAsset, DELETE as deleteSceneAsset } from "../../app/api/scene-assets/[sceneAssetId]/route";
import { PrismaAssetRepository } from "../../lib/assets/prismaAssetRepository";
import { prisma } from "../../lib/db/client";

/**
 * Testes de integração da API HTTP do Asset Binding Engine (Sprint 2.0)
 * — contra Postgres real, sem mocks. Mesma técnica de
 * `tests/api/assets-route.test.ts`.
 */
describe("API HTTP do Asset Binding Engine (integração)", () => {
  const TEST_EMAIL = "temp-scene-assets-route-test@example.com";
  let projectId: string;
  let assetId: string;
  const createdSceneAssetIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP scene-assets route", ownerId: user.id } });
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
  });

  afterAll(async () => {
    await prisma.sceneAsset.deleteMany({ where: { id: { in: createdSceneAssetIds } } });
    await prisma.asset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
    return new NextRequest(new URL(url, "http://localhost"), {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    });
  }

  describe("POST /api/scene-assets — vincular", () => {
    it("vincula um Asset a uma cena e retorna 201", async () => {
      const response = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "1", assetId, role: "REFERENCE_IMAGE" })
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      createdSceneAssetIds.push(body.id);

      expect(body.sceneId).toBe("1");
      expect(body.assetId).toBe(assetId);
      expect(body.role).toBe("REFERENCE_IMAGE");
      expect(body.asset.name).toBe("referencia.png");
    });

    it("retorna 400 para um role inválido", async () => {
      const response = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "1", assetId, role: "PROTAGONISTA" })
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_ROLE");
    });

    it("retorna 400 quando 'sceneId' está ausente", async () => {
      const response = await postSceneAsset(jsonRequest("/api/scene-assets", "POST", { assetId, role: "MUSIC" }));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("SCENE_ID_REQUIRED");
    });

    it("retorna 404 para um Asset inexistente", async () => {
      const response = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "1", assetId: "asset-fantasma", role: "MUSIC" })
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_NOT_FOUND");
    });

    it("retorna 409 ao vincular o mesmo Asset com o mesmo papel duas vezes", async () => {
      const response = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "1", assetId, role: "REFERENCE_IMAGE" })
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error.code).toBe("ALREADY_LINKED");
    });
  });

  describe("GET /api/scene-assets — listar", () => {
    it("lista os vínculos da cena", async () => {
      const response = await listSceneAssets(jsonRequest("/api/scene-assets?sceneId=1", "GET"));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((s: { assetId: string }) => s.assetId === assetId)).toBe(true);
    });

    it("retorna 400 sem o parâmetro 'sceneId'", async () => {
      const response = await listSceneAssets(jsonRequest("/api/scene-assets", "GET"));
      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /api/scene-assets/:sceneAssetId — atualizar papel", () => {
    it("atualiza o papel e retorna 200", async () => {
      const created = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "2", assetId, role: "MUSIC" })
      ).then((r) => r.json());
      createdSceneAssetIds.push(created.id);

      const response = await patchSceneAsset(
        jsonRequest(`/api/scene-assets/${created.id}`, "PATCH", { role: "SFX" }),
        { params: { sceneAssetId: created.id } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.role).toBe("SFX");
    });

    it("retorna 400 para um role inválido", async () => {
      const response = await patchSceneAsset(
        jsonRequest("/api/scene-assets/qualquer", "PATCH", { role: "INVALIDO" }),
        { params: { sceneAssetId: "qualquer" } }
      );
      expect(response.status).toBe(400);
    });

    it("retorna 404 para um vínculo inexistente", async () => {
      const response = await patchSceneAsset(
        jsonRequest("/api/scene-assets/scene-asset-fantasma", "PATCH", { role: "SFX" }),
        { params: { sceneAssetId: "scene-asset-fantasma" } }
      );
      expect(response.status).toBe(404);
    });

    it("retorna 409 se o novo papel colidir com outro vínculo já existente", async () => {
      const a = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "3", assetId, role: "VOICE" })
      ).then((r) => r.json());
      const b = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "3", assetId, role: "PROMPT" })
      ).then((r) => r.json());
      createdSceneAssetIds.push(a.id, b.id);

      const response = await patchSceneAsset(
        jsonRequest(`/api/scene-assets/${b.id}`, "PATCH", { role: "VOICE" }),
        { params: { sceneAssetId: b.id } }
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error.code).toBe("ALREADY_LINKED");
    });
  });

  describe("DELETE /api/scene-assets/:sceneAssetId — desvincular", () => {
    it("remove o vínculo e retorna 204 (o Asset em si não é afetado)", async () => {
      const created = await postSceneAsset(
        jsonRequest("/api/scene-assets", "POST", { sceneId: "4", assetId, role: "TEXTURE" })
      ).then((r) => r.json());

      const response = await deleteSceneAsset(jsonRequest(`/api/scene-assets/${created.id}`, "DELETE"), {
        params: { sceneAssetId: created.id },
      });
      expect(response.status).toBe(204);

      const list = await listSceneAssets(jsonRequest("/api/scene-assets?sceneId=4", "GET")).then((r) => r.json());
      expect(list).toHaveLength(0);

      const assetRepository = new PrismaAssetRepository();
      const stillThere = await assetRepository.findAsset(assetId);
      expect(stillThere).toBeDefined();
      expect(stillThere?.status).not.toBe("DELETED");
    });

    it("retorna 404 para um vínculo inexistente", async () => {
      const response = await deleteSceneAsset(jsonRequest("/api/scene-assets/scene-asset-fantasma", "DELETE"), {
        params: { sceneAssetId: "scene-asset-fantasma" },
      });
      expect(response.status).toBe(404);
    });
  });
});
