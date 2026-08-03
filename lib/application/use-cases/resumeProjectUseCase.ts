import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Retoma o pipeline de um projeto pausado (equivalente a
 * `PipelineEngine.resumeProject`, orquestrado através do `PipelineService`).
 */
export interface ResumeProjectUseCase extends UseCase<ProjectIdInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case.
 */
export class ResumeProjectUseCaseImpl implements ResumeProjectUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineState> {
    return this.pipelineService.resumeProject(projectId);
  }
}
