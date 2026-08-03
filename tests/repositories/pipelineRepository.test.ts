import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPipelineRepository } from "../../lib/repositories/pipelineRepository";
import { prisma } from "../../lib/db/client";
import { PipelineEngine } from "../../lib/pipeline-core/engine";

/**
 * Teste de integração do `PrismaPipelineRepository.getTimeline` — contra
 * o PostgreSQL real (mesma técnica das demais Tasks: Project/User de
 * teste criados e removidos ao final, sem resíduo).
 */
describe("PrismaPipelineRepository — getTimeline (integração)", () => {
  const TEST_EMAIL = "temp-repo-timeline-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP repo timeline", ownerId: user.id } });
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

  it("retorna undefined para um projeto sem nenhuma PipelineExecution", async () => {
    const repository = new PrismaPipelineRepository();
    expect(await repository.getTimeline("projeto-que-nao-existe-de-verdade")).toBeUndefined();
  });

  it("persiste e lê de volta os eventos na ordem cronológica correta", async () => {
    const repository = new PrismaPipelineRepository();

    const engine = new PipelineEngine(projectId);
    engine.startProject(); // emite project-started + module-started (literary-director)
    engine.finishModule("literary-director"); // emite module-finished

    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());

    // appendEvent é chamado pelo PipelineService normalmente; aqui, para
    // testar o Repository isoladamente, gravamos os mesmos 3 eventos
    // manualmente, na mesma ordem que o Engine os emitiu.
    await repository.appendEvent(projectId, { type: "project-started", projectId });
    await repository.appendEvent(projectId, {
      type: "module-started",
      projectId,
      moduleId: "literary-director",
    });
    await repository.appendEvent(projectId, {
      type: "module-finished",
      projectId,
      moduleId: "literary-director",
    });

    const timeline = await repository.getTimeline(projectId);

    expect(timeline).toBeDefined();
    expect(timeline).toHaveLength(3);
    expect(timeline!.map((entry) => entry.type)).toEqual([
      "project-started",
      "module-started",
      "module-finished",
    ]);
    expect(timeline![1].moduleId).toBe("literary-director");
    expect(timeline![1].event).toMatchObject({ type: "module-started", moduleId: "literary-director" });
  });
});

describe("PrismaPipelineRepository — getDashboard (integração)", () => {
  const TEST_EMAIL = "temp-repo-dashboard-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP repo dashboard", ownerId: user.id } });
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

  it("retorna undefined para um projeto sem nenhuma PipelineExecution", async () => {
    const repository = new PrismaPipelineRepository();
    expect(await repository.getDashboard("projeto-que-nao-existe-de-verdade")).toBeUndefined();
  });

  it("retorna startedAt, updatedAt e eventCount consistentes com o que foi persistido", async () => {
    const repository = new PrismaPipelineRepository();

    const engine = new PipelineEngine(projectId);
    engine.startProject();
    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());
    await repository.appendEvent(projectId, { type: "project-started", projectId });
    await repository.appendEvent(projectId, {
      type: "module-started",
      projectId,
      moduleId: "literary-director",
    });

    const before = await prisma.pipelineExecution.findFirst({ where: { projectId } });

    const dashboard = await repository.getDashboard(projectId);

    expect(dashboard).toBeDefined();
    expect(dashboard!.eventCount).toBe(2);
    expect(dashboard!.startedAt.getTime()).toBe(before!.createdAt.getTime());
    expect(dashboard!.updatedAt.getTime()).toBe(before!.updatedAt.getTime());

    engine.finishModule("literary-director");
    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());
    await repository.appendEvent(projectId, {
      type: "module-finished",
      projectId,
      moduleId: "literary-director",
    });

    const after = await repository.getDashboard(projectId);
    expect(after!.eventCount).toBe(3);
    expect(after!.startedAt.getTime()).toBe(dashboard!.startedAt.getTime());
    expect(after!.updatedAt.getTime()).toBeGreaterThanOrEqual(dashboard!.updatedAt.getTime());
  });
});

describe("PrismaPipelineRepository — createVersion / listVersions (integração)", () => {
  const TEST_EMAIL = "temp-repo-versions-test@example.com";
  let projectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP repo versions", ownerId: user.id } });
    projectId = project.id;
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

  it("retorna undefined para um projeto sem nenhuma PipelineExecution", async () => {
    const repository = new PrismaPipelineRepository();
    expect(await repository.createVersion("projeto-que-nao-existe-de-verdade", "X")).toBeUndefined();
    expect(await repository.listVersions("projeto-que-nao-existe-de-verdade")).toBeUndefined();
  });

  it("cria versões numeradas sequencialmente e as lista, mais recente primeiro", async () => {
    const repository = new PrismaPipelineRepository();

    const engine = new PipelineEngine(projectId);
    engine.startProject();
    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());

    const first = await repository.createVersion(projectId, "Versão Inicial");
    expect(first).toBeDefined();
    expect(first!.name).toBe("Versão Inicial");

    engine.finishModule("literary-director");
    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());
    const second = await repository.createVersion(projectId, "Segunda Versão");

    const rows = await prisma.version.findMany({ where: { projectId }, orderBy: { versionNumber: "asc" } });
    expect(rows.map((row) => row.versionNumber)).toEqual([1, 2]);
    expect(rows[0].label).toBe("Versão Inicial");
    expect(rows[1].label).toBe("Segunda Versão");
    // O snapshot da segunda versão reflete o estado JÁ persistido no
    // momento da criação (literary-director concluído), não um estado
    // reconstruído manualmente.
    const secondSnapshot = rows[1].snapshot as { state: { modules: Record<string, { status: string }> } };
    expect(secondSnapshot.state.modules["literary-director"].status).toBe("done");

    const versions = await repository.listVersions(projectId);
    expect(versions).toBeDefined();
    expect(versions!.map((v) => v.id)).toEqual([second!.id, first!.id]);
    expect(versions!.map((v) => v.name)).toEqual(["Segunda Versão", "Versão Inicial"]);
  });
});

describe("PrismaPipelineRepository — getVersion (integração)", () => {
  const TEST_EMAIL = "temp-repo-getversion-test@example.com";
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const project = await prisma.project.create({ data: { name: "TEMP repo getVersion", ownerId: user.id } });
    const otherProject = await prisma.project.create({ data: { name: "TEMP repo getVersion (outro)", ownerId: user.id } });
    projectId = project.id;
    otherProjectId = otherProject.id;
  });

  afterAll(async () => {
    for (const id of [projectId, otherProjectId]) {
      const exec = await prisma.pipelineExecution.findFirst({ where: { projectId: id } });
      if (exec) {
        await prisma.pipelineEvent.deleteMany({ where: { pipelineExecutionId: exec.id } });
        await prisma.moduleExecution.deleteMany({ where: { pipelineExecutionId: exec.id } });
        await prisma.pipelineExecution.delete({ where: { id: exec.id } });
      }
      await prisma.version.deleteMany({ where: { projectId: id } });
    }
    await prisma.project.deleteMany({ where: { id: { in: [projectId, otherProjectId] } } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });
  });

  it("retorna undefined para uma versão que não existe", async () => {
    const repository = new PrismaPipelineRepository();
    expect(await repository.getVersion(projectId, "versao-que-nao-existe")).toBeUndefined();
  });

  it("devolve o snapshot completo, exatamente como foi salvo", async () => {
    const repository = new PrismaPipelineRepository();

    const engine = new PipelineEngine(projectId);
    engine.startProject();
    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());
    const created = await repository.createVersion(projectId, "Versão com snapshot");

    const version = await repository.getVersion(projectId, created!.id);

    expect(version).toBeDefined();
    expect(version!.name).toBe("Versão com snapshot");
    expect(version!.snapshot.projectStatus).toBe("running");
    expect(version!.snapshot.state.modules["literary-director"].status).toBe("active");
    expect(version!.snapshot.state.projectId).toBe(projectId);
  });

  it("retorna undefined se a versão existe mas pertence a outro projeto", async () => {
    const repository = new PrismaPipelineRepository();

    const engine = new PipelineEngine(projectId);
    await repository.saveState(projectId, engine.getState(), engine.getProjectStatus());
    const created = await repository.createVersion(projectId, "Versão de projectId");

    expect(await repository.getVersion(otherProjectId, created!.id)).toBeUndefined();
  });
});
