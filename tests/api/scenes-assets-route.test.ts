import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as postSceneAsset, GET as listSceneAssets } from "../../app/api/scenes/[sceneId]/assets/route";
import {
  PATCH as patchSceneAsset,
  DELETE as deleteSceneAsset,
} from "../../app/api/scenes/[sceneId]/assets/[sceneAssetId]/route";
import { PrismaAssetRepository } from "../../lib/assets/prismaAssetRepository";
import { prisma } from "../../lib/db/client";

/**
 * Testes de integração da API HTTP do Asset Binding Engine — contra
 * Postgres real, sem mocks. Mesma técnica de `tests/api/assets-route.test.ts`.
 *
 * Rotas migradas de `/api/scene-assets` (Sprint 2.0) para
 * `/api/scenes/:sceneId/assets*` (Task "Scene Asset Binding") — `sceneId`
 * agora vem do segmento de rota, nunca do corpo/query.
 */
describe("API HTTP /api/scenes/:sceneId/assets (integração)", () => {
  const TEST_EMAIL = "temp-scenes-assets-route-test@example.com";
  let projectId: string;
  let assetId: string;
  const createdSceneAssetIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP scenes-assets route", ownerId: user.id } });
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

  async function attach(sceneId: string, body: unknown) {
    const response = await postSceneAsset(jsonRequest(`/api/scenes/${sceneId}/assets`, "POST", body), {
      params: { sceneId },
    });
    return response;
  }

  describe("POST /api/scenes/:sceneId/assets — vincular", () => {
    it("vincula um Asset a uma cena e retorna 201", async () => {
      const response = await attach("1", { assetId, role: "REFERENCE_IMAGE" });

      expect(response.status).toBe(201);
      const body = await response.json();
      createdSceneAssetIds.push(body.id);

      expect(body.sceneId).toBe("1");
      expect(body.assetId).toBe(assetId);
      expect(body.role).toBe("REFERENCE_IMAGE");
      expect(body.order).toBe(0);
      expect(body.metadata).toBeNull();
      expect(body.asset.name).toBe("referencia.png");
    });

    it("aceita um role fora do vocabulário sugerido — não há mais uma lista fechada", async () => {
      const response = await attach("1", { assetId, role: "PROTAGONISTA" });
      expect(response.status).toBe(201);
      const body = await response.json();
      createdSceneAssetIds.push(body.id);
      expect(body.role).toBe("PROTAGONISTA");
    });

    it("aceita order e metadata explícitos", async () => {
      const response = await attach("1", { assetId, role: "OUTRO2", order: 3, metadata: { nota: "closeup" } });
      expect(response.status).toBe(201);
      const body = await response.json();
      createdSceneAssetIds.push(body.id);
      expect(body.order).toBe(3);
      expect(body.metadata).toEqual({ nota: "closeup" });
    });

    it("retorna 400 quando 'assetId' está ausente", async () => {
      const response = await attach("1", { role: "MUSIC" });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_ID_REQUIRED");
    });

    it("retorna 400 para um role vazio", async () => {
      const response = await attach("1", { assetId, role: "" });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_ROLE");
    });

    it("retorna 400 para um order negativo ou não inteiro", async () => {
      const response = await attach("1", { assetId, role: "MUSIC", order: -1 });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_ORDER");
    });

    it("retorna 400 quando metadata não é um objeto", async () => {
      const response = await attach("1", { assetId, role: "MUSIC", metadata: "não é objeto" });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_METADATA");
    });

    it("retorna 404 para um Asset inexistente", async () => {
      const response = await attach("1", { assetId: "asset-fantasma", role: "MUSIC" });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_NOT_FOUND");
    });

    it("retorna 409 ao vincular o mesmo Asset com o mesmo papel duas vezes", async () => {
      const response = await attach("1", { assetId, role: "REFERENCE_IMAGE" });
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error.code).toBe("ALREADY_LINKED");
    });
  });

  describe("GET /api/scenes/:sceneId/assets — listar", () => {
    it("lista os vínculos da cena, em ordem", async () => {
      const response = await listSceneAssets(jsonRequest("/api/scenes/1/assets", "GET"), { params: { sceneId: "1" } });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((s: { assetId: string }) => s.assetId === assetId)).toBe(true);
    });

    it("retorna lista vazia para uma cena sem vínculos", async () => {
      const response = await listSceneAssets(jsonRequest("/api/scenes/cena-vazia/assets", "GET"), {
        params: { sceneId: "cena-vazia" },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });
  });

  describe("PATCH /api/scenes/:sceneId/assets/:sceneAssetId — atualizar", () => {
    it("atualiza o papel e retorna 200", async () => {
      const created = await attach("2", { assetId, role: "MUSIC" }).then((r) => r.json());
      createdSceneAssetIds.push(created.id);

      const response = await patchSceneAsset(
        jsonRequest(`/api/scenes/2/assets/${created.id}`, "PATCH", { role: "SFX" }),
        { params: { sceneId: "2", sceneAssetId: created.id } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.role).toBe("SFX");
    });

    it("atualiza order e metadata sem exigir role", async () => {
      const created = await attach("2", { assetId, role: "VOICE" }).then((r) => r.json());
      createdSceneAssetIds.push(created.id);

      const response = await patchSceneAsset(
        jsonRequest(`/api/scenes/2/assets/${created.id}`, "PATCH", { order: 8, metadata: { revisado: true } }),
        { params: { sceneId: "2", sceneAssetId: created.id } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.role).toBe("VOICE");
      expect(body.order).toBe(8);
      expect(body.metadata).toEqual({ revisado: true });
    });

    it("retorna 400 quando nenhum campo é informado", async () => {
      const response = await patchSceneAsset(jsonRequest("/api/scenes/2/assets/qualquer", "PATCH", {}), {
        params: { sceneId: "2", sceneAssetId: "qualquer" },
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("NO_FIELDS_TO_UPDATE");
    });

    it("retorna 400 para um role vazio", async () => {
      const response = await patchSceneAsset(
        jsonRequest("/api/scenes/2/assets/qualquer", "PATCH", { role: "" }),
        { params: { sceneId: "2", sceneAssetId: "qualquer" } }
      );
      expect(response.status).toBe(400);
    });

    it("retorna 404 para um vínculo inexistente", async () => {
      const response = await patchSceneAsset(
        jsonRequest("/api/scenes/2/assets/scene-asset-fantasma", "PATCH", { role: "SFX" }),
        { params: { sceneId: "2", sceneAssetId: "scene-asset-fantasma" } }
      );
      expect(response.status).toBe(404);
    });

    it("retorna 409 se o novo papel colidir com outro vínculo já existente", async () => {
      const a = await attach("3", { assetId, role: "VOICE" }).then((r) => r.json());
      const b = await attach("3", { assetId, role: "PROMPT" }).then((r) => r.json());
      createdSceneAssetIds.push(a.id, b.id);

      const response = await patchSceneAsset(
        jsonRequest(`/api/scenes/3/assets/${b.id}`, "PATCH", { role: "VOICE" }),
        { params: { sceneId: "3", sceneAssetId: b.id } }
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error.code).toBe("ALREADY_LINKED");
    });
  });

  describe("DELETE /api/scenes/:sceneId/assets/:sceneAssetId — desvincular", () => {
    it("remove SOMENTE o vínculo e retorna 204 — o Asset em si não é afetado", async () => {
      const created = await attach("4", { assetId, role: "TEXTURE" }).then((r) => r.json());

      const response = await deleteSceneAsset(jsonRequest(`/api/scenes/4/assets/${created.id}`, "DELETE"), {
        params: { sceneId: "4", sceneAssetId: created.id },
      });
      expect(response.status).toBe(204);

      const list = await listSceneAssets(jsonRequest("/api/scenes/4/assets", "GET"), {
        params: { sceneId: "4" },
      }).then((r) => r.json());
      expect(list).toHaveLength(0);

      const assetRepository = new PrismaAssetRepository();
      const stillThere = await assetRepository.findAsset(assetId);
      expect(stillThere).toBeDefined();
      expect(stillThere?.status).not.toBe("DELETED");
    });

    it("retorna 404 para um vínculo inexistente", async () => {
      const response = await deleteSceneAsset(jsonRequest("/api/scenes/4/assets/scene-asset-fantasma", "DELETE"), {
        params: { sceneId: "4", sceneAssetId: "scene-asset-fantasma" },
      });
      expect(response.status).toBe(404);
    });
  });
});
