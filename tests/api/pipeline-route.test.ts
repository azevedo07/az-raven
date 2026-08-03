import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getState } from "../../app/api/pipeline/[projectId]/state/route";
import { POST as postStart } from "../../app/api/pipeline/[projectId]/start/route";
import { POST as postFinish } from "../../app/api/pipeline/[projectId]/finish/route";
import { POST as postRunNext } from "../../app/api/pipeline/[projectId]/run-next/route";
import { POST as postPause } from "../../app/api/pipeline/[projectId]/pause/route";
import { POST as postResume } from "../../app/api/pipeline/[projectId]/resume/route";
import { POST as postCancel } from "../../app/api/pipeline/[projectId]/cancel/route";
import { POST as postFail } from "../../app/api/pipeline/[projectId]/modules/[moduleId]/fail/route";
import { POST as postRetry } from "../../app/api/pipeline/[projectId]/modules/[moduleId]/retry/route";
import { GET as getTimeline } from "../../app/api/pipeline/[projectId]/timeline/route";
import { GET as getDashboard } from "../../app/api/pipeline/[projectId]/dashboard/route";
import { GET as getVersions, POST as postVersion } from "../../app/api/pipeline/[projectId]/versions/route";
import { POST as postRestore } from "../../app/api/pipeline/[projectId]/versions/[versionId]/restore/route";
import { prisma } from "../../lib/db/client";

describe("GET /api/pipeline/:projectId/state", () => {
  it("retorna 200 com o estado do pipeline para um projeto existente", async () => {
    const request = new Request("http://localhost/api/pipeline/o-corvo/state");
    const response = await getState(request, { params: { projectId: "o-corvo" } });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.projectId).toBe("o-corvo");
    expect(body.modules["literary-director"].status).toBe("done");
    expect(body.modules["production"].status).toBe("active");
  });

  it("retorna 404 com PROJECT_NOT_FOUND para um projeto desconhecido", async () => {
    const request = new Request("http://localhost/api/pipeline/projeto-inexistente/state");
    const response = await getState(request, { params: { projectId: "projeto-inexistente" } });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe("PROJECT_NOT_FOUND");
  });
});

describe("GET /api/pipeline/:projectId/timeline", () => {
  it("retorna 200 com um array para um projeto existente (o-corvo foi seedado sem eventos — ver Sprint 1.3)", async () => {
    const request = new Request("http://localhost/api/pipeline/o-corvo/timeline");
    const response = await getTimeline(request, { params: { projectId: "o-corvo" } });

    expect(response.status).toBe(200);

    const body = await response.json();
    // "o-corvo" foi seedado via seedOCorvoEngine() (Sprint 1.3), que
    // conduz o Engine direto, sem passar por runAction/subscribe — por
    // isso não tem PipelineEvent gravado. O array vazio é o
    // comportamento correto e honesto, não um bug desta Task.
    expect(Array.isArray(body)).toBe(true);
  });

  it("retorna 404 com PROJECT_NOT_FOUND para um projeto desconhecido", async () => {
    const request = new Request("http://localhost/api/pipeline/projeto-inexistente/timeline");
    const response = await getTimeline(request, { params: { projectId: "projeto-inexistente" } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("PROJECT_NOT_FOUND");
  });
});

describe("GET /api/pipeline/:projectId/dashboard", () => {
  it("retorna 200 com o retrato agregado do pipeline para um projeto existente", async () => {
    const request = new Request("http://localhost/api/pipeline/o-corvo/dashboard");
    const response = await getDashboard(request, { params: { projectId: "o-corvo" } });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.projectId).toBe("o-corvo");
    expect(body.projectStatus).toBe("running");
    expect(body.currentModule).toBe("production");
    expect(body.totalModules).toBe(12);
    expect(body.completedModules).toBe(8);
    expect(body.activeModules).toBe(1);
    expect(body.pendingModules).toBe(3);
    expect(body.failedModules).toBe(0);
    expect(body.pausedModules).toBe(0);
    expect(typeof body.progress).toBe("number");
    expect(typeof body.startedAt).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
  });

  it("retorna 404 com PROJECT_NOT_FOUND para um projeto desconhecido", async () => {
    const request = new Request("http://localhost/api/pipeline/projeto-inexistente/dashboard");
    const response = await getDashboard(request, { params: { projectId: "projeto-inexistente" } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("PROJECT_NOT_FOUND");
  });
});

describe("POST e GET /api/pipeline/:projectId/versions", () => {
  const TEST_EMAIL = "temp-route-versions-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP rota de versões", ownerId: user.id } });
    projectId = project.id;

    const request = new Request(`http://localhost/api/pipeline/${projectId}/start`, { method: "POST" });
    await postStart(request, { params: { projectId } });
  });

  afterAll(async () => {
    const exec = await prisma.pipelineExecution.findFirst({ where: { projectId } });
    if (exec) {
      await prisma.pipelineEvent.deleteMany({ where: { pipelineExecutionId: exec.id } });
      await prisma.moduleExecution.deleteMany({ where: { pipelineExecutionId: exec.id } });
      await prisma.pipelineExecution.delete({ where: { id: exec.id } });
    }
    await prisma.version.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  it("POST sem 'name' retorna 400", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/versions`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await postVersion(request, { params: { projectId } });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VERSION_NAME_REQUIRED");
  });

  it("POST /versions retorna 404 para um projeto desconhecido", async () => {
    const request = new Request("http://localhost/api/pipeline/projeto-inexistente/versions", {
      method: "POST",
      body: JSON.stringify({ name: "X" }),
    });
    const response = await postVersion(request, { params: { projectId: "projeto-inexistente" } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("GET /versions retorna 200 com lista vazia antes de qualquer versão criada", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/versions`);
    const response = await getVersions(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("POST /versions cria uma versão e retorna 201 com id/name/createdAt", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/versions`, {
      method: "POST",
      body: JSON.stringify({ name: "Versão Inicial" }),
    });
    const response = await postVersion(request, { params: { projectId } });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("Versão Inicial");
    expect(typeof body.id).toBe("string");
    expect(typeof body.createdAt).toBe("string");
    // A listagem não deve incluir o payload completo do snapshot.
    expect(body.snapshot).toBeUndefined();
  });

  it("GET /versions reflete a versão recém-criada", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/versions`);
    const response = await getVersions(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Versão Inicial");
    expect(body[0].snapshot).toBeUndefined();
  });
});

describe("POST /api/pipeline/:projectId/versions/:versionId/restore", () => {
  const TEST_EMAIL = "temp-route-restore-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP rota de restore", ownerId: user.id } });
    projectId = project.id;

    const request = new Request(`http://localhost/api/pipeline/${projectId}/start`, { method: "POST" });
    await postStart(request, { params: { projectId } });
  });

  afterAll(async () => {
    const exec = await prisma.pipelineExecution.findFirst({ where: { projectId } });
    if (exec) {
      await prisma.pipelineEvent.deleteMany({ where: { pipelineExecutionId: exec.id } });
      await prisma.moduleExecution.deleteMany({ where: { pipelineExecutionId: exec.id } });
      await prisma.pipelineExecution.delete({ where: { id: exec.id } });
    }
    await prisma.version.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  it("retorna 404 'Version not found' para uma versão inexistente", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/versions/versao-fantasma/restore`, {
      method: "POST",
    });
    const response = await postRestore(request, { params: { projectId, versionId: "versao-fantasma" } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.message).toBe("Version not found");
  });

  it("fluxo completo: cria versão, modifica o pipeline, restaura, e confirma estado idêntico ao snapshot", async () => {
    // 1. Estado logo após o start: literary-director "active".
    const stateBefore = await getState(new Request(`http://localhost/api/pipeline/${projectId}/state`), {
      params: { projectId },
    }).then((r) => r.json());
    expect(stateBefore.modules["literary-director"].status).toBe("active");

    // Criar versão nesse ponto.
    const createResponse = await postVersion(
      new Request(`http://localhost/api/pipeline/${projectId}/versions`, {
        method: "POST",
        body: JSON.stringify({ name: "Antes de terminar literary-director" }),
      }),
      { params: { projectId } }
    );
    expect(createResponse.status).toBe(201);
    const { id: versionId } = await createResponse.json();

    // 2. Modificar o pipeline: termina literary-director, inicia emotion-engine.
    await postFinish(
      new Request(`http://localhost/api/pipeline/${projectId}/finish`, {
        method: "POST",
        body: JSON.stringify({ moduleId: "literary-director" }),
      }),
      { params: { projectId } }
    );
    const stateModified = await postRunNext(
      new Request(`http://localhost/api/pipeline/${projectId}/run-next`, { method: "POST" }),
      { params: { projectId } }
    ).then((r) => r.json());
    expect(stateModified.state.modules["literary-director"].status).toBe("done");
    expect(stateModified.state.modules["emotion-engine"].status).toBe("active");

    // 3. Restaurar.
    const restoreResponse = await postRestore(
      new Request(`http://localhost/api/pipeline/${projectId}/versions/${versionId}/restore`, { method: "POST" }),
      { params: { projectId, versionId } }
    );
    expect(restoreResponse.status).toBe(200);
    const restored = await restoreResponse.json();

    // 4. Confirmar: estado idêntico ao snapshot do momento da criação da versão.
    expect(restored.state.modules["literary-director"].status).toBe("active");
    expect(restored.state.modules["emotion-engine"].status).toBe("pending");
    expect(restored.projectStatus).toBe("running");
    expect(restored.state).toEqual(stateBefore);

    const stateAfterRestore = await getState(new Request(`http://localhost/api/pipeline/${projectId}/state`), {
      params: { projectId },
    }).then((r) => r.json());
    expect(stateAfterRestore).toEqual(stateBefore);

    // 5. A Timeline registrou VERSION_RESTORED.
    const timelineBody = await getTimeline(new Request(`http://localhost/api/pipeline/${projectId}/timeline`), {
      params: { projectId },
    }).then((r) => r.json());
    const restoreEvent = timelineBody.find((entry: { type: string }) => entry.type === "VERSION_RESTORED");
    expect(restoreEvent).toBeDefined();
    expect(restoreEvent.event).toMatchObject({ type: "VERSION_RESTORED", projectId, versionId });
  });
});

describe("Rotas mutáveis (start/finish/run-next/pause/resume/cancel)", () => {
  const TEST_EMAIL = "temp-route-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP rota de teste", ownerId: user.id } });
    projectId = project.id;
  });

  afterAll(async () => {
    const exec = await prisma.pipelineExecution.findFirst({ where: { projectId } });
    if (exec) {
      await prisma.pipelineEvent.deleteMany({ where: { pipelineExecutionId: exec.id } });
      await prisma.moduleExecution.deleteMany({ where: { pipelineExecutionId: exec.id } });
      await prisma.pipelineExecution.delete({ where: { id: exec.id } });
    }
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  it("POST /start inicia o pipeline do projeto", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/start`, { method: "POST" });
    const response = await postStart(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modules["literary-director"].status).toBe("active");
  });

  it("POST /start de novo no mesmo projeto retorna 409", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/start`, { method: "POST" });
    const response = await postStart(request, { params: { projectId } });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("START_PROJECT_FAILED");
  });

  it("POST /finish sem moduleId retorna 400", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/finish`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await postFinish(request, { params: { projectId } });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("MODULE_ID_REQUIRED");
  });

  it("POST /finish conclui o módulo informado", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/finish`, {
      method: "POST",
      body: JSON.stringify({ moduleId: "literary-director" }),
    });
    const response = await postFinish(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modules["literary-director"].status).toBe("done");
  });

  it("POST /run-next identifica e inicia o próximo módulo disponível", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/run-next`, { method: "POST" });
    const response = await postRunNext(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.startedModuleId).toBe("emotion-engine");
    expect(body.state.modules["emotion-engine"].status).toBe("active");
  });

  it("POST /pause pausa o projeto", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/pause`, { method: "POST" });
    const response = await postPause(request, { params: { projectId } });

    expect(response.status).toBe(200);
  });

  it("POST /resume retoma o projeto pausado", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/resume`, { method: "POST" });
    const response = await postResume(request, { params: { projectId } });

    expect(response.status).toBe(200);
  });

  it("POST /modules/:moduleId/fail marca o módulo ativo como falho", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/modules/emotion-engine/fail`, {
      method: "POST",
    });
    const response = await postFail(request, { params: { projectId, moduleId: "emotion-engine" } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modules["emotion-engine"].status).toBe("error");
  });

  it("POST /modules/:moduleId/retry reinicia o módulo que falhou", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/modules/emotion-engine/retry`, {
      method: "POST",
    });
    const response = await postRetry(request, { params: { projectId, moduleId: "emotion-engine" } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modules["emotion-engine"].status).toBe("pending");
  });

  it("POST /modules/:moduleId/retry retorna 409 para um módulo que não está em falha", async () => {
    // emotion-engine acabou de voltar para "pending" no teste anterior — retry exige "error".
    const request = new Request(`http://localhost/api/pipeline/${projectId}/modules/emotion-engine/retry`, {
      method: "POST",
    });
    const response = await postRetry(request, { params: { projectId, moduleId: "emotion-engine" } });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("RETRY_MODULE_FAILED");
  });

  it("GET /timeline retorna os eventos acumulados, ordenados cronologicamente", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/timeline`);
    const response = await getTimeline(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();

    const types = body.map((entry: { type: string }) => entry.type);
    expect(types).toEqual([
      "project-started",
      "module-started",
      "module-finished",
      "module-started",
      "project-paused",
      "project-resumed",
      "module-failed",
      "module-retried",
    ]);

    const timestamps = body.map((entry: { createdAt: string }) => new Date(entry.createdAt).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });

  it("GET /dashboard reflete o estado acumulado (1 concluído, emotion-engine pendente e disponível de novo após o retry)", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/dashboard`);
    const response = await getDashboard(request, { params: { projectId } });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.projectStatus).toBe("running");
    expect(body.currentModule).toBeNull();
    expect(body.nextModule).toBe("emotion-engine");
    expect(body.completedModules).toBe(1);
    expect(body.activeModules).toBe(0);
    expect(body.pausedModules).toBe(0);
    expect(body.failedModules).toBe(0);
    expect(body.pendingModules).toBe(11);
    expect(body.eventCount).toBe(8);
  });

  it("POST /cancel cancela o projeto definitivamente", async () => {
    const request = new Request(`http://localhost/api/pipeline/${projectId}/cancel`, { method: "POST" });
    const response = await postCancel(request, { params: { projectId } });

    expect(response.status).toBe(200);
  });
});
