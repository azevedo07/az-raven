import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Retorna o estado atual do pipeline de um projeto, ou `undefined` se o
 * projeto não tiver um pipeline inicializado.
 */
export interface GetProjectStateUseCase extends UseCase<ProjectIdInput, PipelineState | undefined> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case.
 */
export class GetProjectStateUseCaseImpl implements GetProjectStateUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineState | undefined> {
    return this.pipelineService.getPipelineState(projectId);
  }
}
