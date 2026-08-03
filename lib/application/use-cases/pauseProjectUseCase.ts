import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Pausa o pipeline de um projeto (equivalente a `PipelineEngine.pauseProject`,
 * orquestrado através do `PipelineService`).
 */
export interface PauseProjectUseCase extends UseCase<ProjectIdInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case.
 */
export class PauseProjectUseCaseImpl implements PauseProjectUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineState> {
    return this.pipelineService.pauseProject(projectId);
  }
}
