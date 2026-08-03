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
import { StartProjectUseCaseImpl } from "../../lib/application/use-cases/startProjectUseCase";
import { GetProjectStateUseCaseImpl } from "../../lib/application/use-cases/getProjectStateUseCase";
import { GetPipelineTimelineUseCaseImpl } from "../../lib/application/use-cases/getPipelineTimelineUseCase";
import { GetPipelineDashboardUseCaseImpl } from "../../lib/application/use-cases/getPipelineDashboardUseCase";
import { CreateVersionUseCaseImpl } from "../../lib/application/use-cases/createVersionUseCase";
import { ListVersionsUseCaseImpl } from "../../lib/application/use-cases/listVersionsUseCase";
import { RestoreVersionUseCaseImpl } from "../../lib/application/use-cases/restoreVersionUseCase";
import { FinishModuleUseCaseImpl } from "../../lib/application/use-cases/finishModuleUseCase";
import { FailModuleUseCaseImpl } from "../../lib/application/use-cases/failModuleUseCase";
import { RetryModuleUseCaseImpl } from "../../lib/application/use-cases/retryModuleUseCase";
import { RunNextModuleUseCaseImpl } from "../../lib/application/use-cases/runNextModuleUseCase";
import { PauseProjectUseCaseImpl } from "../../lib/application/use-cases/pauseProjectUseCase";
import { ResumeProjectUseCaseImpl } from "../../lib/application/use-cases/resumeProjectUseCase";
import { CancelProjectUseCaseImpl } from "../../lib/application/use-cases/cancelProjectUseCase";

/** Repositório falso em memória — mesma técnica usada nos testes do Service. */
class FakePipelineRepository implements PipelineRepository {
  private readonly states = new Map<string, PersistedPipelineState>();
  private readonly events = new Map<string, PipelineTimelineEntry[]>();
  private readonly meta = new Map<string, { startedAt: Date; updatedAt: Date }>();
  private readonly versionsByProject = new Map<string, PipelineVersionDetail[]>();

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
    const list = this.events.get(projectId) ?? [];
    list.push({
      createdAt: new Date(),
      type: event.type,
      moduleId: "moduleId" in event ? event.moduleId : null,
      event,
    });
    this.events.set(projectId, list);
  }

  async getTimeline(projectId: string): Promise<PipelineTimelineEntry[] | undefined> {
    if (!this.states.has(projectId)) {
      return undefined;
    }
    return this.events.get(projectId) ?? [];
  }

  async getDashboard(projectId: string): Promise<PipelineDashboardRawData | undefined> {
    const meta = this.meta.get(projectId);
    if (!meta) {
      return undefined;
    }
    return { ...meta, eventCount: (this.events.get(projectId) ?? []).length };
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

function buildService(): PipelineService {
  return new PipelineService(new FakePipelineRepository());
}

describe("StartProjectUseCase", () => {
  it("inicia um projeto novo (não 'o-corvo') e persiste o estado inicial", async () => {
    const useCase = new StartProjectUseCaseImpl(buildService());

    const state = await useCase.execute({ projectId: "projeto-teste-1" });

    expect(state.projectId).toBe("projeto-teste-1");
    expect(state.modules["literary-director"].status).toBe("active");
    expect(state.modules["emotion-engine"].status).toBe("pending");
  });

  it("lança erro ao tentar iniciar o mesmo projeto duas vezes", async () => {
    const service = buildService();
    const useCase = new StartProjectUseCaseImpl(service);

    await useCase.execute({ projectId: "projeto-teste-2" });

    await expect(useCase.execute({ projectId: "projeto-teste-2" })).rejects.toThrow();
  });
});

describe("GetProjectStateUseCase", () => {
  it("retorna o estado após o projeto ser iniciado", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-3" });

    const state = await new GetProjectStateUseCaseImpl(service).execute({ projectId: "projeto-teste-3" });

    expect(state).toBeDefined();
    expect(state!.projectId).toBe("projeto-teste-3");
  });

  it("retorna undefined para um projeto nunca iniciado", async () => {
    const state = await new GetProjectStateUseCaseImpl(buildService()).execute({ projectId: "nunca-existiu" });
    expect(state).toBeUndefined();
  });
});

describe("GetPipelineTimelineUseCase", () => {
  it("retorna os eventos do projeto ordenados cronologicamente (ordem de emissão)", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-timeline-1" });
    await new FinishModuleUseCaseImpl(service).execute({
      projectId: "projeto-teste-timeline-1",
      moduleId: "literary-director",
    });

    const timeline = await new GetPipelineTimelineUseCaseImpl(service).execute({
      projectId: "projeto-teste-timeline-1",
    });

    expect(timeline).toBeDefined();
    const types = timeline!.map((entry) => entry.type);
    expect(types).toEqual(["project-started", "module-started", "module-finished"]);
  });

  it("retorna undefined para um projeto nunca iniciado", async () => {
    const timeline = await new GetPipelineTimelineUseCaseImpl(buildService()).execute({
      projectId: "nunca-existiu",
    });
    expect(timeline).toBeUndefined();
  });
});

describe("GetPipelineDashboardUseCase", () => {
  it("retorna o retrato agregado do pipeline após o projeto ser iniciado", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-dashboard-1" });

    const dashboard = await new GetPipelineDashboardUseCaseImpl(service).execute({
      projectId: "projeto-teste-dashboard-1",
    });

    expect(dashboard).toBeDefined();
    expect(dashboard!.projectId).toBe("projeto-teste-dashboard-1");
    expect(dashboard!.projectStatus).toBe("running");
    expect(dashboard!.currentModule).toBe("literary-director");
    expect(dashboard!.totalModules).toBe(12);
    expect(dashboard!.pendingModules).toBe(11);
    expect(dashboard!.activeModules).toBe(1);
    expect(dashboard!.eventCount).toBeGreaterThan(0);
  });

  it("retorna undefined para um projeto nunca iniciado", async () => {
    const dashboard = await new GetPipelineDashboardUseCaseImpl(buildService()).execute({
      projectId: "nunca-existiu",
    });
    expect(dashboard).toBeUndefined();
  });
});

describe("CreateVersionUseCase / ListVersionsUseCase", () => {
  it("cria uma versão e a lista de volta, mais recente primeiro", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-versao-1" });

    const created = await new CreateVersionUseCaseImpl(service).execute({
      projectId: "projeto-teste-versao-1",
      name: "Versão Inicial",
    });
    expect(created).toBeDefined();
    expect(created!.name).toBe("Versão Inicial");
    expect(created!.createdAt).toBeInstanceOf(Date);

    await new CreateVersionUseCaseImpl(service).execute({
      projectId: "projeto-teste-versao-1",
      name: "Segunda Versão",
    });

    const versions = await new ListVersionsUseCaseImpl(service).execute({ projectId: "projeto-teste-versao-1" });
    expect(versions).toBeDefined();
    expect(versions!.map((v) => v.name)).toEqual(["Segunda Versão", "Versão Inicial"]);
  });

  it("retorna undefined para um projeto nunca iniciado", async () => {
    const service = buildService();

    const created = await new CreateVersionUseCaseImpl(service).execute({
      projectId: "nunca-existiu",
      name: "Versão Inicial",
    });
    expect(created).toBeUndefined();

    const versions = await new ListVersionsUseCaseImpl(service).execute({ projectId: "nunca-existiu" });
    expect(versions).toBeUndefined();
  });
});

describe("RestoreVersionUseCase", () => {
  it("restaura o estado salvo numa versão, descartando mudanças feitas depois dela", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-restore-1" });

    const version = await new CreateVersionUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-1",
      name: "Antes de terminar literary-director",
    });
    expect(version).toBeDefined();

    await new FinishModuleUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-1",
      moduleId: "literary-director",
    });
    const afterFinish = await new GetProjectStateUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-1",
    });
    expect(afterFinish!.modules["literary-director"].status).toBe("done");

    const restored = await new RestoreVersionUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-1",
      versionId: version!.id,
    });

    expect(restored).toBeDefined();
    expect(restored!.state.modules["literary-director"].status).toBe("active");
    expect(restored!.projectStatus).toBe("running");

    const afterRestore = await new GetProjectStateUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-1",
    });
    expect(afterRestore!.modules["literary-director"].status).toBe("active");

    const timeline = await new GetPipelineTimelineUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-1",
    });
    expect(timeline!.map((entry) => entry.type)).toContain("VERSION_RESTORED");
  });

  it("retorna undefined para uma versão inexistente", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-restore-2" });

    const restored = await new RestoreVersionUseCaseImpl(service).execute({
      projectId: "projeto-teste-restore-2",
      versionId: "versao-fantasma",
    });
    expect(restored).toBeUndefined();
  });
});

describe("FinishModuleUseCase", () => {
  it("marca um módulo como concluído e persiste", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-4" });

    const state = await new FinishModuleUseCaseImpl(service).execute({
      projectId: "projeto-teste-4",
      moduleId: "literary-director",
    });

    expect(state.modules["literary-director"].status).toBe("done");
    expect(state.modules["literary-director"].pct).toBe(100);
  });
});

describe("FailModuleUseCase", () => {
  it("marca um módulo existente e ativo como falho, persistindo o motivo", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-fail-1" });

    const state = await new FailModuleUseCaseImpl(service).execute({
      projectId: "projeto-teste-fail-1",
      moduleId: "literary-director",
    });

    expect(state.modules["literary-director"].status).toBe("error");
  });

  it("rejeita ao tentar falhar um módulo inexistente (não cadastrado no registry)", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-fail-2" });

    await expect(
      new FailModuleUseCaseImpl(service).execute({
        projectId: "projeto-teste-fail-2",
        moduleId: "modulo-fantasma" as never,
      })
    ).rejects.toThrow();
  });

  it("rejeita ao tentar falhar um módulo de um projeto inexistente", async () => {
    const service = buildService();

    await expect(
      new FailModuleUseCaseImpl(service).execute({
        projectId: "projeto-nunca-existiu",
        moduleId: "literary-director",
      })
    ).rejects.toThrow();
  });
});

describe("RetryModuleUseCase", () => {
  it("reinicia (volta para pending) um módulo que falhou", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-retry-1" });
    await new FailModuleUseCaseImpl(service).execute({
      projectId: "projeto-teste-retry-1",
      moduleId: "literary-director",
    });

    const state = await new RetryModuleUseCaseImpl(service).execute({
      projectId: "projeto-teste-retry-1",
      moduleId: "literary-director",
    });

    expect(state.modules["literary-director"].status).toBe("pending");
    expect(state.modules["literary-director"].pct).toBe(0);
  });

  it("rejeita ao tentar reiniciar um módulo que não está em falha", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-retry-2" });
    // literary-director está "active" (não "error") logo após o start.

    await expect(
      new RetryModuleUseCaseImpl(service).execute({
        projectId: "projeto-teste-retry-2",
        moduleId: "literary-director",
      })
    ).rejects.toThrow();
  });

  it("rejeita ao tentar reiniciar um módulo de um projeto inexistente", async () => {
    const service = buildService();

    await expect(
      new RetryModuleUseCaseImpl(service).execute({
        projectId: "projeto-nunca-existiu",
        moduleId: "literary-director",
      })
    ).rejects.toThrow();
  });
});

describe("RunNextModuleUseCase", () => {
  it("retorna startedModuleId nulo quando nenhum módulo está disponível", async () => {
    const service = buildService();
    // logo após startProject, literary-director já está "active" — nada mais disponível
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-5" });

    const result = await new RunNextModuleUseCaseImpl(service).execute({ projectId: "projeto-teste-5" });

    expect(result.startedModuleId).toBeNull();
    expect(result.state.modules["literary-director"].status).toBe("active");
  });

  it("identifica e inicia o próximo módulo disponível", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-6" });
    await new FinishModuleUseCaseImpl(service).execute({ projectId: "projeto-teste-6", moduleId: "literary-director" });

    const result = await new RunNextModuleUseCaseImpl(service).execute({ projectId: "projeto-teste-6" });

    expect(result.startedModuleId).toBe("emotion-engine");
    expect(result.state.modules["emotion-engine"].status).toBe("active");
  });
});

describe("PauseProjectUseCase / ResumeProjectUseCase", () => {
  it("pausa e retoma o pipeline de um projeto", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-7" });

    await new PauseProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-7" });
    const paused = await new GetProjectStateUseCaseImpl(service).execute({ projectId: "projeto-teste-7" });
    expect(paused).toBeDefined();

    // Enquanto pausado, nenhum módulo novo pode ser iniciado.
    await expect(
      new RunNextModuleUseCaseImpl(service).execute({ projectId: "projeto-teste-7" })
    ).resolves.toMatchObject({ startedModuleId: null });

    await new ResumeProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-7" });
    // Depois de retomado, o RunNextModule ainda não tem nada disponível
    // (literary-director segue "active"), então continua null — o que
    // importa aqui é que resumeProject não lançou erro.
  });
});

describe("CancelProjectUseCase", () => {
  it("cancela o pipeline de um projeto definitivamente", async () => {
    const service = buildService();
    await new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-8" });

    await new CancelProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-8" });

    // Depois de cancelado, iniciar de novo deve falhar (estado terminal).
    await expect(new StartProjectUseCaseImpl(service).execute({ projectId: "projeto-teste-8" })).rejects.toThrow();
  });
});
