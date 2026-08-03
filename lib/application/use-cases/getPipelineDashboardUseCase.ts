import { PipelineDashboard, PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Retorna o retrato agregado do pipeline de um projeto para o Dashboard
 * de Execução, ou `undefined` se o projeto não tiver pipeline
 * inicializado (equivalente a `PipelineService.getDashboard`).
 */
export interface GetPipelineDashboardUseCase extends UseCase<ProjectIdInput, PipelineDashboard | undefined> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class GetPipelineDashboardUseCaseImpl implements GetPipelineDashboardUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineDashboard | undefined> {
    return this.pipelineService.getDashboard(projectId);
  }
}
