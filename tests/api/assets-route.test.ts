import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as postAsset, GET as listAssets } from "../../app/api/assets/route";
import { GET as getAsset, PATCH as patchAsset, DELETE as deleteAsset } from "../../app/api/assets/[assetId]/route";
import { POST as uploadAsset } from "../../app/api/assets/[assetId]/upload/route";
import { GET as downloadAsset } from "../../app/api/assets/[assetId]/download/route";
import { prisma } from "../../lib/db/client";
import { LocalStorageAdapter } from "../../lib/storage/localStorageAdapter";

/**
 * Testes de integração da API HTTP do Asset Manager (Sprint 1.8, Task 3)
 * — contra Postgres real e o sistema de arquivos real (via o mesmo
 * `LocalStorageAdapter` que `lib/assets/container.ts` já usa), sem
 * mocks. Mesma técnica de `tests/api/pipeline-route.test.ts`: Project/User
 * de teste criados em `beforeAll`, removidos em `afterAll` — incluindo
 * qualquer arquivo físico que os testes de upload tenham gravado.
 *
 * Os cenários de falha injetada/rollback do `AssetService` (Storage
 * falhando, Repository falhando) já têm cobertura exaustiva e
 * determinística em `tests/assets/assetService.test.ts` (Sprint 1.8,
 * Task 2), usando fakes com injeção de falha — reproduzir isso aqui
 * exigiria mockar o Postgres/disco reais, o que contrariaria o próprio
 * princípio de "sem mocks" deste arquivo. Em vez disso, os testes de
 * rollback aqui verificam os *efeitos observáveis* pela rota HTTP: nada
 * é criado no Storage quando o Asset não existe, e o arquivo
 * efetivamente some do Storage depois de um DELETE bem-sucedido.
 */
describe("API HTTP do Asset Manager (integração)", () => {
  const TEST_EMAIL = "temp-assets-route-test@example.com";
  let projectId: string;
  const createdAssetIds: string[] = [];
  const storage = new LocalStorageAdapter();

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP assets route", ownerId: user.id } });
    projectId = project.id;
  });

  afterAll(async () => {
    for (const assetId of createdAssetIds) {
      const row = await prisma.asset.findUnique({ where: { id: assetId } });
      if (row?.storageKey) {
        await storage.delete(row.storageKey).catch(() => {});
      }
    }
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
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

  async function createTestAsset(overrides: Record<string, unknown> = {}) {
    const response = await postAsset(
      jsonRequest("/api/assets", "POST", {
        projectId,
        type: "image",
        name: "poster.png",
        originalName: "poster (1).png",
        mimeType: "image/png",
        extension: "png",
        size: 1024,
        ...overrides,
      })
    );
    const body = await response.json();
    createdAssetIds.push(body.id);
    return body as { id: string; status: string };
  }

  describe("POST /api/assets — Criar Asset", () => {
    it("cria um Asset e retorna 201 com status PENDING", async () => {
      const response = await postAsset(
        jsonRequest("/api/assets", "POST", {
          projectId,
          type: "image",
          name: "criado.png",
          originalName: "criado (1).png",
          mimeType: "image/png",
          extension: "png",
          size: 2048,
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      createdAssetIds.push(body.id);

      expect(body.status).toBe("PENDING");
      expect(body.projectId).toBe(projectId);
      expect(body.storageKey).toBeNull();
    });

    it("retorna 400 quando o corpo está ausente/inválido", async () => {
      const request = new NextRequest(new URL("/api/assets", "http://localhost"), { method: "POST" });
      const response = await postAsset(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_BODY");
    });

    it("retorna 400 quando 'type' não é um AssetType válido", async () => {
      const response = await postAsset(
        jsonRequest("/api/assets", "POST", {
          projectId,
          type: "planilha-excel",
          name: "x",
          originalName: "x",
          mimeType: "image/png",
          extension: "png",
          size: 1,
        })
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_TYPE");
    });

    it("retorna 400 quando 'size' é negativo", async () => {
      const response = await postAsset(
        jsonRequest("/api/assets", "POST", {
          projectId,
          type: "image",
          name: "x",
          originalName: "x",
          mimeType: "image/png",
          extension: "png",
          size: -1,
        })
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_SIZE");
    });
  });

  describe("GET /api/assets — Listar Assets", () => {
    it("lista os Assets do projeto", async () => {
      await createTestAsset({ name: "para-listar.png" });

      const response = await listAssets(jsonRequest(`/api/assets?projectId=${projectId}`, "GET"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((a: { projectId: string }) => a.projectId === projectId)).toBe(true);
    });

    it("retorna 400 sem o parâmetro de query 'projectId'", async () => {
      const response = await listAssets(jsonRequest("/api/assets", "GET"));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("PROJECT_ID_REQUIRED");
    });
  });

  describe("GET /api/assets/:assetId — Obter Asset", () => {
    it("retorna 200 com o Asset existente", async () => {
      const created = await createTestAsset();

      const response = await getAsset(jsonRequest(`/api/assets/${created.id}`, "GET"), {
        params: { assetId: created.id },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(created.id);
    });

    it("retorna 404 para um Asset inexistente", async () => {
      const response = await getAsset(jsonRequest("/api/assets/asset-fantasma", "GET"), {
        params: { assetId: "asset-fantasma" },
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_NOT_FOUND");
    });
  });

  describe("PATCH /api/assets/:assetId — Atualizar Asset", () => {
    it("atualiza campos parciais e retorna 200", async () => {
      const created = await createTestAsset();

      const response = await patchAsset(
        jsonRequest(`/api/assets/${created.id}`, "PATCH", { name: "novo-nome.png" }),
        { params: { assetId: created.id } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe("novo-nome.png");
    });

    it("retorna 400 para um status inválido", async () => {
      const created = await createTestAsset();

      const response = await patchAsset(
        jsonRequest(`/api/assets/${created.id}`, "PATCH", { status: "EM_ANDAMENTO" }),
        { params: { assetId: created.id } }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_STATUS");
    });

    it("retorna 404 para um Asset inexistente", async () => {
      const response = await patchAsset(jsonRequest("/api/assets/asset-fantasma", "PATCH", { name: "x" }), {
        params: { assetId: "asset-fantasma" },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/assets/:assetId — Soft Delete", () => {
    it("retorna 204, marca o Asset como DELETED (sem apagar a linha) e remove o arquivo do Storage", async () => {
      const created = await createTestAsset();
      const uploadResponse = await uploadAsset(
        multipartRequest(`/api/assets/${created.id}/upload`, Buffer.from("conteúdo")),
        { params: { assetId: created.id } }
      );
      const uploaded = await uploadResponse.json();
      expect(await storage.exists(uploaded.storageKey)).toBe(true);

      const response = await deleteAsset(jsonRequest(`/api/assets/${created.id}`, "DELETE"), {
        params: { assetId: created.id },
      });
      expect(response.status).toBe(204);

      const afterDelete = await getAsset(jsonRequest(`/api/assets/${created.id}`, "GET"), {
        params: { assetId: created.id },
      });
      expect(afterDelete.status).toBe(200); // soft delete — a linha continua existindo.
      const afterDeleteBody = await afterDelete.json();
      expect(afterDeleteBody.status).toBe("DELETED");

      expect(await storage.exists(uploaded.storageKey)).toBe(false);
    });

    it("é idempotente: uma segunda chamada de DELETE no mesmo Asset com upload continua retornando 204, não 500", async () => {
      // Regressão: descoberta em verificação ao vivo. AssetRepository
      // (congelado) nunca limpa `storageKey` após o soft delete, então
      // uma segunda chamada tenta remover de novo um arquivo que já não
      // existe mais no Storage (StorageFileNotFoundError) — sem
      // tratamento na rota, isso vazava como 500 para o cliente, apesar
      // de a intenção do DELETE (este Asset não deveria mais existir)
      // já estar plenamente satisfeita.
      const created = await createTestAsset();
      await uploadAsset(multipartRequest(`/api/assets/${created.id}/upload`, Buffer.from("x")), {
        params: { assetId: created.id },
      });

      const first = await deleteAsset(jsonRequest(`/api/assets/${created.id}`, "DELETE"), {
        params: { assetId: created.id },
      });
      const second = await deleteAsset(jsonRequest(`/api/assets/${created.id}`, "DELETE"), {
        params: { assetId: created.id },
      });

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
    });

    it("retorna 404 para um Asset inexistente", async () => {
      const response = await deleteAsset(jsonRequest("/api/assets/asset-fantasma", "DELETE"), {
        params: { assetId: "asset-fantasma" },
      });
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/assets/:assetId/upload — Upload do arquivo", () => {
    it("envia o arquivo, retorna 200 e o Asset fica READY com storageKey/hash", async () => {
      const created = await createTestAsset();
      const content = Buffer.from("conteúdo real do arquivo de teste");

      const response = await uploadAsset(multipartRequest(`/api/assets/${created.id}/upload`, content, "image/png"), {
        params: { assetId: created.id },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("READY");
      expect(body.storageKey).toBeTruthy();
      expect(body.hash).toBeTruthy();

      expect(await storage.exists(body.storageKey)).toBe(true);
    });

    it("retorna 404 (Asset inexistente) sem gravar nada no Storage", async () => {
      const response = await uploadAsset(
        multipartRequest("/api/assets/asset-fantasma/upload", Buffer.from("x")),
        { params: { assetId: "asset-fantasma" } }
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_NOT_FOUND");
      // Rollback observável: nada é gravado no Storage quando o Asset não existe.
      expect(await storage.exists(`assets/${projectId}/asset-fantasma.png`)).toBe(false);
    });

    it("retorna 400 (Multipart inválido) quando o corpo não é multipart/form-data", async () => {
      const request = new NextRequest(new URL("/api/assets/qualquer/upload", "http://localhost"), {
        method: "POST",
        body: "isto não é multipart",
        headers: { "Content-Type": "application/json" },
      });

      const response = await uploadAsset(request, { params: { assetId: "qualquer" } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("INVALID_MULTIPART");
    });

    it("retorna 400 (Upload inválido) quando o campo 'file' está ausente", async () => {
      const created = await createTestAsset();
      const formData = new FormData();
      formData.set("outroCampo", "valor");

      const request = new NextRequest(new URL(`/api/assets/${created.id}/upload`, "http://localhost"), {
        method: "POST",
        body: formData,
      });

      const response = await uploadAsset(request, { params: { assetId: created.id } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("FILE_REQUIRED");
    });

    it("retorna 409 ao tentar enviar um arquivo para um Asset já removido", async () => {
      const created = await createTestAsset();
      await deleteAsset(jsonRequest(`/api/assets/${created.id}`, "DELETE"), { params: { assetId: created.id } });

      const response = await uploadAsset(
        multipartRequest(`/api/assets/${created.id}/upload`, Buffer.from("x")),
        { params: { assetId: created.id } }
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_DELETED");
    });
  });

  describe("GET /api/assets/:assetId/download — Download do arquivo", () => {
    it("devolve o conteúdo com Content-Type, Content-Length e Content-Disposition corretos", async () => {
      const created = await createTestAsset({ originalName: "relatorio final.pdf" });
      const content = Buffer.from("conteúdo do relatório");
      await uploadAsset(multipartRequest(`/api/assets/${created.id}/upload`, content, "application/pdf"), {
        params: { assetId: created.id },
      });

      const response = await downloadAsset(jsonRequest(`/api/assets/${created.id}/download`, "GET"), {
        params: { assetId: created.id },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Length")).toBe(String(content.length));
      expect(response.headers.get("Content-Disposition")).toContain("relatorio");

      const bytes = Buffer.from(await response.arrayBuffer());
      expect(bytes.equals(content)).toBe(true);
    });

    it("retorna 404 (Asset inexistente)", async () => {
      const response = await downloadAsset(jsonRequest("/api/assets/asset-fantasma/download", "GET"), {
        params: { assetId: "asset-fantasma" },
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("ASSET_NOT_FOUND");
    });

    it("retorna 404 (arquivo ainda não enviado) para um Asset que existe mas nunca foi upado", async () => {
      const created = await createTestAsset();

      const response = await downloadAsset(jsonRequest(`/api/assets/${created.id}/download`, "GET"), {
        params: { assetId: created.id },
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("FILE_NOT_UPLOADED");
    });

    it("retorna 404 (arquivo inexistente no Storage) para um Asset removido cujo arquivo já foi apagado", async () => {
      const created = await createTestAsset();
      await uploadAsset(multipartRequest(`/api/assets/${created.id}/upload`, Buffer.from("x")), {
        params: { assetId: created.id },
      });
      await deleteAsset(jsonRequest(`/api/assets/${created.id}`, "DELETE"), { params: { assetId: created.id } });

      // O registro ainda existe (soft delete) e ainda tem storageKey
      // preenchido, mas o arquivo físico já foi removido do Storage —
      // cenário real de "arquivo inexistente" distinto de "Asset inexistente".
      const response = await downloadAsset(jsonRequest(`/api/assets/${created.id}/download`, "GET"), {
        params: { assetId: created.id },
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("FILE_NOT_FOUND");
    });
  });
});

function multipartRequest(url: string, content: Buffer, mimeType = "application/octet-stream"): NextRequest {
  const formData = new FormData();
  const file = new File([new Uint8Array(content)], "arquivo-de-teste.bin", { type: mimeType });
  formData.set("file", file);

  return new NextRequest(new URL(url, "http://localhost"), {
    method: "POST",
    body: formData,
  });
}
