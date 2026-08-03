import { PipelineVersionSummary } from "../../repositories/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Lista as versões (snapshots) já salvas do pipeline de um projeto, mais
 * recente primeiro, ou `undefined` se o projeto não tiver pipeline
 * inicializado (equivalente a `PipelineService.listVersions`).
 */
export interface ListVersionsUseCase extends UseCase<ProjectIdInput, PipelineVersionSummary[] | undefined> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class ListVersionsUseCaseImpl implements ListVersionsUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineVersionSummary[] | undefined> {
    return this.pipelineService.listVersions(projectId);
  }
}
