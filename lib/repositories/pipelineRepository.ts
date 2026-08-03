import "server-only";
import { prisma } from "../db/client";
import { ModuleId, PipelineState, ProjectPipelineStatus } from "../pipeline-core/types";
import {
  PersistedPipelineState,
  PipelineDashboardRawData,
  PipelineEventRecord,
  PipelineRepository,
  PipelineTimelineEntry,
  PipelineVersionDetail,
  PipelineVersionSummary,
} from "./types";

/**
 * Implementação Prisma do `PipelineRepository`. Único arquivo, além de
 * `lib/db/client.ts`, que importa o Prisma Client gerado — o Pipeline
 * Service (Task futura de integração) depende só da interface
 * (`lib/repositories/types.ts`), nunca desta classe diretamente por
 * import estático fora do ponto de composição.
 *
 * Convenção adotada: o schema não força "uma PipelineExecution por
 * projeto" (não há `@@unique` em `projectId` sozinho, de propósito —
 * alterar o schema não fazia parte desta Task). Este repositório trata a
 * execução mais recente (`orderBy: createdAt desc`) como "a atual" de um
 * projeto.
 */
export class PrismaPipelineRepository implements PipelineRepository {
  async findState(projectId: string): Promise<PersistedPipelineState | undefined> {
    const execution = await prisma.pipelineExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { modules: true },
    });

    if (!execution) {
      return undefined;
    }

    const modules = {} as PipelineState["modules"];
    for (const module of execution.modules) {
      modules[module.moduleId as ModuleId] = {
        moduleId: module.moduleId as ModuleId,
        status: module.status,
        pct: module.pct,
        eta: module.eta ?? "",
        description: module.description ?? "",
      };
    }

    return {
      state: { projectId, modules },
      projectStatus: execution.status,
    };
  }

  async saveState(projectId: string, state: PipelineState, projectStatus: ProjectPipelineStatus): Promise<void> {
    const executionId = await this.upsertExecution(projectId, projectStatus);

    for (const moduleState of Object.values(state.modules)) {
      await prisma.moduleExecution.upsert({
        where: {
          pipelineExecutionId_moduleId: {
            pipelineExecutionId: executionId,
            moduleId: moduleState.moduleId,
          },
        },
        update: {
          status: moduleState.status,
          pct: moduleState.pct,
          eta: moduleState.eta || null,
          description: moduleState.description || null,
        },
        create: {
          pipelineExecutionId: executionId,
          moduleId: moduleState.moduleId,
          status: moduleState.status,
          pct: moduleState.pct,
          eta: moduleState.eta || null,
          description: moduleState.description || null,
        },
      });
    }
  }

  async appendEvent(projectId: string, event: PipelineEventRecord): Promise<void> {
    const execution = await prisma.pipelineExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!execution) {
      throw new Error(
        `Não é possível registrar evento para o projeto "${projectId}": nenhuma PipelineExecution encontrada. Chame saveState() antes de appendEvent().`
      );
    }

    await prisma.pipelineEvent.create({
      data: {
        pipelineExecutionId: execution.id,
        type: event.type,
        moduleId: "moduleId" in event ? event.moduleId : null,
        // JSON.parse(JSON.stringify(...)) apaga o tipo de domínio (union
        // fechado sem assinatura de índice `string`) e garante um valor
        // estruturalmente JSON puro — mesma técnica já usada em
        // createVersion() para o snapshot.
        payload: JSON.parse(JSON.stringify(event)),
      },
    });
  }

  async getTimeline(projectId: string): Promise<PipelineTimelineEntry[] | undefined> {
    const execution = await prisma.pipelineExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!execution) {
      return undefined;
    }

    const events = await prisma.pipelineEvent.findMany({
      where: { pipelineExecutionId: execution.id },
      orderBy: { createdAt: "asc" },
    });

    return events.map((event) => ({
      createdAt: event.createdAt,
      type: event.type,
      moduleId: event.moduleId,
      event: event.payload as unknown as PipelineEventRecord,
    }));
  }

  async getDashboard(projectId: string): Promise<PipelineDashboardRawData | undefined> {
    const execution = await prisma.pipelineExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!execution) {
      return undefined;
    }

    const eventCount = await prisma.pipelineEvent.count({
      where: { pipelineExecutionId: execution.id },
    });

    return {
      startedAt: execution.createdAt,
      updatedAt: execution.updatedAt,
      eventCount,
    };
  }

  async createVersion(projectId: string, name: string): Promise<PipelineVersionSummary | undefined> {
    // Reaproveita findState() (a mesma tradução ModuleExecution ->
    // PipelineState já usada por todo o resto do Repository) em vez de
    // montar uma segunda leitura manual do mesmo estado — "não
    // reconstruir manualmente" (Sprint 1.5, Task 4).
    const persisted = await this.findState(projectId);
    if (!persisted) {
      return undefined;
    }

    const lastVersion = await prisma.version.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const created = await prisma.version.create({
      data: {
        projectId,
        versionNumber,
        label: name,
        // JSON.parse(JSON.stringify(...)) em vez de passar `persisted`
        // direto: apaga o tipo de domínio (PipelineState usa um Record
        // indexado por ModuleId, não uma assinatura de índice `string`
        // genérica) e garante um valor estruturalmente JSON puro — o que
        // um snapshot deveria ser de qualquer forma.
        snapshot: JSON.parse(JSON.stringify({ state: persisted.state, projectStatus: persisted.projectStatus })),
      },
    });

    return { id: created.id, name: created.label ?? name, createdAt: created.createdAt };
  }

  async listVersions(projectId: string): Promise<PipelineVersionSummary[] | undefined> {
    const execution = await prisma.pipelineExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!execution) {
      return undefined;
    }

    const versions = await prisma.version.findMany({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
    });

    return versions.map((version) => ({
      id: version.id,
      name: version.label ?? "",
      createdAt: version.createdAt,
    }));
  }

  async getVersion(projectId: string, versionId: string): Promise<PipelineVersionDetail | undefined> {
    // Escopado por projectId + id: uma versão só é devolvida se pertencer
    // ao projeto informado — nenhum outro projeto pode ler (ou restaurar)
    // uma versão que não é sua adivinhando o id.
    const version = await prisma.version.findFirst({
      where: { id: versionId, projectId },
    });

    if (!version) {
      return undefined;
    }

    return {
      id: version.id,
      name: version.label ?? "",
      createdAt: version.createdAt,
      snapshot: version.snapshot as unknown as PersistedPipelineState,
    };
  }

  private async upsertExecution(projectId: string, projectStatus: ProjectPipelineStatus): Promise<string> {
    const existing = await prisma.pipelineExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.pipelineExecution.update({
        where: { id: existing.id },
        data: { status: projectStatus },
      });
      return existing.id;
    }

    const created = await prisma.pipelineExecution.create({
      data: { projectId, status: projectStatus },
    });
    return created.id;
  }
}
