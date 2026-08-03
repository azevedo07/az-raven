import { describe, expect, it } from "vitest";
import { PipelineService } from "../../lib/pipeline-service/pipelineService";
import {
  PersistedPipelineState,
  PipelineDashboardRawData,
  PipelineEventRecord,
  PipelineRepository,
  PipelineTimelineEntry,
  PipelineVersionDetail,
  PipelineVersionSummary,
} from "../../lib/repositories/types";
import { PipelineState, ProjectPipelineStatus } from "../../lib/pipeline-core/types";

/**
 * Repositório falso em memória — exatamente o ponto da injeção de
 * dependência: testar o Pipeline Service sem precisar de um Postgres
 * real.
 */
class FakePipelineRepository implements PipelineRepository {
  private readonly states = new Map<string, PersistedPipelineState>();
  private readonly meta = new Map<string, { startedAt: Date; updatedAt: Date }>();
  private readonly versionsByProject = new Map<string, PipelineVersionDetail[]>();
  readonly events: { projectId: string; event: PipelineEventRecord }[] = [];

  async findState(projectId: string): Promise<PersistedPipelineState | undefined> {
    return this.states.get(projectId);
  }

  async saveState(projectId: string, state: PipelineState, projectStatus: ProjectPipelineStatus): Promise<void> {
    this.states.set(projectId, { state, projectStatus });
    const now = new Date();
    const existing = this.meta.get(projectId);
    this.meta.set(projectId, { startedAt: existing?.startedAt ?? now, updatedAt: now });
  }

  async appendEvent(projectId: string, event: PipelineEventRecord): Promise<void> {
    this.events.push({ projectId, event });
  }

  async getTimeline(projectId: string): Promise<PipelineTimelineEntry[] | undefined> {
    if (!this.states.has(projectId)) {
      return undefined;
    }
    return this.events
      .filter((entry) => entry.projectId === projectId)
      .map((entry) => ({
        createdAt: new Date(),
        type: entry.event.type,
        moduleId: "moduleId" in entry.event ? entry.event.moduleId : null,
        event: entry.event,
      }));
  }

  async getDashboard(projectId: string): Promise<PipelineDashboardRawData | undefined> {
    const meta = this.meta.get(projectId);
    if (!meta) {
      return undefined;
    }
    const eventCount = this.events.filter((entry) => entry.projectId === projectId).length;
    return { ...meta, eventCount };
  }

  async createVersion(projectId: string, name: string): Promise<PipelineVersionSummary | undefined> {
    const state = this.states.get(projectId);
    if (!state) {
      return undefined;
    }
    const list = this.versionsByProject.get(projectId) ?? [];
    const version: PipelineVersionDetail = {
      id: `v${list.length + 1}-${projectId}`,
      name,
      createdAt: new Date(),
      snapshot: state,
    };
    list.push(version);
    this.versionsByProject.set(projectId, list);
    return { id: version.id, name: version.name, createdAt: version.createdAt };
  }

  async listVersions(projectId: string): Promise<PipelineVersionSummary[] | undefined> {
    if (!this.states.has(projectId)) {
      return undefined;
    }
    return [...(this.versionsByProject.get(projectId) ?? [])]
      .reverse()
      .map(({ id, name, createdAt }) => ({ id, name, createdAt }));
  }

  async getVersion(projectId: string, versionId: string): Promise<PipelineVersionDetail | undefined> {
    return (this.versionsByProject.get(projectId) ?? []).find((version) => version.id === versionId);
  }
}

describe("Pipeline Service — getPipelineState", () => {
  it("seeda e persiste o projeto de demonstração 'o-corvo' na primeira chamada", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    const state = await service.getPipelineState("o-corvo");

    expect(state).toBeDefined();
    expect(state?.projectId).toBe("o-corvo");

    const doneModules = Object.values(state!.modules).filter((module) => module.status === "done");
    expect(doneModules).toHaveLength(8);
    expect(state!.modules["production"].status).toBe("active");
    expect(state!.modules["quality-director"].status).toBe("pending");
    expect(state!.modules["audience-intelligence"].status).toBe("pending");
    expect(state!.modules["export"].status).toBe("pending");

    const persisted = await repository.findState("o-corvo");
    expect(persisted).toBeDefined();
  });

  it("retorna undefined para um projeto sem pipeline inicializado", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    expect(await service.getPipelineState("projeto-inexistente")).toBeUndefined();
  });
});

describe("Pipeline Service — transições mutáveis", () => {
  it("finishModule aplica a transição, persiste o resultado e registra o evento", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.getPipelineState("o-corvo");

    const afterFinish = await service.finishModule("o-corvo", "production");
    expect(afterFinish.modules["production"].status).toBe("done");
    expect(afterFinish.modules["production"].pct).toBe(100);

    const persisted = await repository.findState("o-corvo");
    expect(persisted?.state.modules["production"].status).toBe("done");

    expect(repository.events.some((entry) => entry.event.type === "module-finished")).toBe(true);
  });

  it("lança erro ao tentar transicionar um projeto sem pipeline inicializado", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await expect(service.startModule("projeto-inexistente", "literary-director")).rejects.toThrow();
  });
});

describe("Pipeline Service — getTimeline", () => {
  it("repassa a linha do tempo do Repository, na ordem em que os eventos foram registrados", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.getPipelineState("o-corvo");
    await service.finishModule("o-corvo", "production");

    const timeline = await service.getTimeline("o-corvo");

    expect(timeline).toBeDefined();
    expect(timeline!.some((entry) => entry.type === "module-finished")).toBe(true);
  });

  it("retorna undefined para um projeto sem pipeline inicializado", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    expect(await service.getTimeline("projeto-inexistente")).toBeUndefined();
  });
});

describe("Pipeline Service — getDashboard", () => {
  it("monta o retrato agregado logo após o início do projeto (um módulo ativo, nada mais disponível)", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.startProject("projeto-teste-dashboard-svc-1");
    const dashboard = await service.getDashboard("projeto-teste-dashboard-svc-1");

    expect(dashboard).toBeDefined();
    expect(dashboard!.projectId).toBe("projeto-teste-dashboard-svc-1");
    expect(dashboard!.projectStatus).toBe("running");
    expect(dashboard!.currentModule).toBe("literary-director");
    expect(dashboard!.totalModules).toBe(12);
    expect(dashboard!.completedModules).toBe(0);
    expect(dashboard!.activeModules).toBe(1);
    expect(dashboard!.pausedModules).toBe(0);
    expect(dashboard!.failedModules).toBe(0);
    expect(dashboard!.pendingModules).toBe(11);
    // literary-director ainda está ativo — emotion-engine depende dele e
    // ainda não está disponível, então não há "próximo módulo" ainda.
    expect(dashboard!.nextModule).toBeNull();
    expect(dashboard!.eventCount).toBeGreaterThan(0);
    expect(dashboard!.startedAt).toBeInstanceOf(Date);
    expect(dashboard!.updatedAt).toBeInstanceOf(Date);
  });

  it("aponta o próximo módulo disponível assim que o módulo atual é concluído", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.startProject("projeto-teste-dashboard-svc-2");
    await service.finishModule("projeto-teste-dashboard-svc-2", "literary-director");

    const dashboard = await service.getDashboard("projeto-teste-dashboard-svc-2");

    expect(dashboard!.currentModule).toBeNull();
    expect(dashboard!.completedModules).toBe(1);
    expect(dashboard!.nextModule).toBe("emotion-engine");
  });

  it("reclassifica um módulo ativo como 'pausado' quando o projeto está pausado", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.startProject("projeto-teste-dashboard-svc-3");
    await service.pauseProject("projeto-teste-dashboard-svc-3");

    const dashboard = await service.getDashboard("projeto-teste-dashboard-svc-3");

    expect(dashboard!.projectStatus).toBe("paused");
    expect(dashboard!.activeModules).toBe(0);
    expect(dashboard!.pausedModules).toBe(1);
  });

  it("retorna undefined para um projeto sem pipeline inicializado", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    expect(await service.getDashboard("projeto-inexistente")).toBeUndefined();
  });
});

describe("Pipeline Service — createVersion / listVersions", () => {
  it("cria uma versão e repassa o resumo retornado pelo Repository", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.startProject("projeto-teste-versao-svc-1");
    const version = await service.createVersion("projeto-teste-versao-svc-1", "Versão Inicial");

    expect(version).toBeDefined();
    expect(version!.name).toBe("Versão Inicial");
    expect(version!.id).toBeTruthy();
    expect(version!.createdAt).toBeInstanceOf(Date);
  });

  it("lista as versões já criadas, mais recente primeiro", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.startProject("projeto-teste-versao-svc-2");
    await service.createVersion("projeto-teste-versao-svc-2", "Primeira");
    await service.createVersion("projeto-teste-versao-svc-2", "Segunda");

    const versions = await service.listVersions("projeto-teste-versao-svc-2");

    expect(versions).toBeDefined();
    expect(versions!.map((v) => v.name)).toEqual(["Segunda", "Primeira"]);
  });

  it("retorna undefined para um projeto sem pipeline inicializado", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    expect(await service.createVersion("projeto-inexistente", "X")).toBeUndefined();
    expect(await service.listVersions("projeto-inexistente")).toBeUndefined();
  });
});

describe("Pipeline Service — restoreVersion (fluxo completo)", () => {
  it("cria versão, modifica o pipeline, restaura, e o estado volta a ser idêntico ao snapshot", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);
    const projectId = "projeto-teste-restore-svc-1";

    // 1. Criar versão — captura o estado logo após o início.
    await service.startProject(projectId);
    const snapshotBefore = await service.getPipelineState(projectId);
    const version = await service.createVersion(projectId, "Estado inicial");
    expect(version).toBeDefined();

    // 2. Modificar o pipeline — termina literary-director e inicia o próximo.
    await service.finishModule(projectId, "literary-director");
    await service.startModule(projectId, "emotion-engine");
    const modifiedState = await service.getPipelineState(projectId);
    expect(modifiedState!.modules["literary-director"].status).toBe("done");
    expect(modifiedState!.modules["emotion-engine"].status).toBe("active");

    // 3. Restaurar.
    const restored = await service.restoreVersion(projectId, version!.id);
    expect(restored).toBeDefined();

    // 4. Confirmar: estado idêntico ao snapshot do momento da criação da versão.
    expect(restored!.state).toEqual(snapshotBefore);
    expect(restored!.state.modules["literary-director"].status).toBe("active");
    expect(restored!.state.modules["emotion-engine"].status).toBe("pending");
    expect(restored!.projectStatus).toBe("running");

    const afterRestore = await service.getPipelineState(projectId);
    expect(afterRestore).toEqual(snapshotBefore);
  });

  it("grava um evento VERSION_RESTORED na Timeline ao restaurar", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);
    const projectId = "projeto-teste-restore-svc-2";

    await service.startProject(projectId);
    const version = await service.createVersion(projectId, "Antes");
    await service.finishModule(projectId, "literary-director");

    await service.restoreVersion(projectId, version!.id);

    const timeline = await service.getTimeline(projectId);
    const restoreEvent = timeline!.find((entry) => entry.type === "VERSION_RESTORED");
    expect(restoreEvent).toBeDefined();
    expect(restoreEvent!.moduleId).toBeNull();
    expect(restoreEvent!.event).toMatchObject({ type: "VERSION_RESTORED", projectId, versionId: version!.id });
  });

  it("retorna undefined para uma versão que não existe", async () => {
    const repository = new FakePipelineRepository();
    const service = new PipelineService(repository);

    await service.startProject("projeto-teste-restore-svc-3");

    expect(await service.restoreVersion("projeto-teste-restore-svc-3", "versao-fantasma")).toBeUndefined();
  });
});
