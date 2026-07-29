import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/pipeline/[projectId]/route";

describe("GET /api/pipeline/:projectId", () => {
  it("retorna 200 com o estado do pipeline para um projeto existente", async () => {
    const request = new Request("http://localhost/api/pipeline/o-corvo");
    const response = await GET(request, { params: { projectId: "o-corvo" } });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.projectId).toBe("o-corvo");
    expect(body.modules["literary-director"].status).toBe("done");
    expect(body.modules["production"].status).toBe("active");
  });

  it("retorna 404 com PROJECT_NOT_FOUND para um projeto desconhecido", async () => {
    const request = new Request("http://localhost/api/pipeline/projeto-inexistente");
    const response = await GET(request, { params: { projectId: "projeto-inexistente" } });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe("PROJECT_NOT_FOUND");
  });
});
