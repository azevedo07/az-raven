import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Cancela definitivamente o pipeline de um projeto (equivalente a
 * `PipelineEngine.cancelProject`, orquestrado através do `PipelineService`).
 */
export interface CancelProjectUseCase extends UseCase<ProjectIdInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case.
 */
export class CancelProjectUseCaseImpl implements CancelProjectUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineState> {
    return this.pipelineService.cancelProject(projectId);
  }
}
