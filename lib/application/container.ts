import "server-only";
import { PrismaPipelineRepository } from "../repositories/pipelineRepository";
import { PipelineService } from "../pipeline-service/pipelineService";
import { StartProjectUseCaseImpl } from "./use-cases/startProjectUseCase";
import { GetProjectStateUseCaseImpl } from "./use-cases/getProjectStateUseCase";
import { GetPipelineTimelineUseCaseImpl } from "./use-cases/getPipelineTimelineUseCase";
import { GetPipelineDashboardUseCaseImpl } from "./use-cases/getPipelineDashboardUseCase";
import { CreateVersionUseCaseImpl } from "./use-cases/createVersionUseCase";
import { ListVersionsUseCaseImpl } from "./use-cases/listVersionsUseCase";
import { RestoreVersionUseCaseImpl } from "./use-cases/restoreVersionUseCase";
import { FinishModuleUseCaseImpl } from "./use-cases/finishModuleUseCase";
import { FailModuleUseCaseImpl } from "./use-cases/failModuleUseCase";
import { RetryModuleUseCaseImpl } from "./use-cases/retryModuleUseCase";
import { RunNextModuleUseCaseImpl } from "./use-cases/runNextModuleUseCase";
import { PauseProjectUseCaseImpl } from "./use-cases/pauseProjectUseCase";
import { ResumeProjectUseCaseImpl } from "./use-cases/resumeProjectUseCase";
import { CancelProjectUseCaseImpl } from "./use-cases/cancelProjectUseCase";

/**
 * Container de composição — o **único** lugar do projeto que instancia
 * `PrismaPipelineRepository`, `PipelineService` e os Use Cases. Rotas de
 * API (e `lib/pipeline-core/store.ts`) importam só este arquivo; nenhum
 * outro ponto do código deve montar essas dependências por conta
 * própria.
 *
 *   container.ts → PipelineService → PipelineRepository → PrismaPipelineRepository
 *                → 7 Use Cases (cada um recebendo o mesmo PipelineService por injeção)
 */

const repository = new PrismaPipelineRepository();

/**
 * Instância composta do Pipeline Service. Exportada para que
 * `lib/pipeline-core/store.ts` (o Server Adapter da UI existente,
 * arquitetura da Sprint 1.2 — não uma rota de API) continue consumindo o
 * Service diretamente, sem duplicar esta composição em outro arquivo.
 */
export const pipelineService = new PipelineService(repository);

/** Os 14 Use Cases (7 da Sprint 1.4 + 7 da Sprint 1.5), cada um montado exatamente uma vez. */
export const useCases = {
  startProject: new StartProjectUseCaseImpl(pipelineService),
  getProjectState: new GetProjectStateUseCaseImpl(pipelineService),
  getPipelineTimeline: new GetPipelineTimelineUseCaseImpl(pipelineService),
  getPipelineDashboard: new GetPipelineDashboardUseCaseImpl(pipelineService),
  createVersion: new CreateVersionUseCaseImpl(pipelineService),
  listVersions: new ListVersionsUseCaseImpl(pipelineService),
  restoreVersion: new RestoreVersionUseCaseImpl(pipelineService),
  finishModule: new FinishModuleUseCaseImpl(pipelineService),
  failModule: new FailModuleUseCaseImpl(pipelineService),
  retryModule: new RetryModuleUseCaseImpl(pipelineService),
  runNextModule: new RunNextModuleUseCaseImpl(pipelineService),
  pauseProject: new PauseProjectUseCaseImpl(pipelineService),
  resumeProject: new ResumeProjectUseCaseImpl(pipelineService),
  cancelProject: new CancelProjectUseCaseImpl(pipelineService),
};
