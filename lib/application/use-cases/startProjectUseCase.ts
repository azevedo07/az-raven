import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Inicia o pipeline de um projeto (equivalente a `PipelineEngine.startProject`,
 * orquestrado através do `PipelineService`).
 */
export interface StartProjectUseCase extends UseCase<ProjectIdInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case.
 */
export class StartProjectUseCaseImpl implements StartProjectUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineState> {
    return this.pipelineService.startProject(projectId);
  }
}
