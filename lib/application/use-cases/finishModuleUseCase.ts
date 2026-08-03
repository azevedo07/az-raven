import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ModuleActionInput, UseCase } from "./shared";

/**
 * Marca um módulo específico do pipeline de um projeto como concluído
 * (equivalente a `PipelineEngine.finishModule`, orquestrado através do
 * `PipelineService`).
 */
export interface FinishModuleUseCase extends UseCase<ModuleActionInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case.
 */
export class FinishModuleUseCaseImpl implements FinishModuleUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId, moduleId }: ModuleActionInput): Promise<PipelineState> {
    return this.pipelineService.finishModule(projectId, moduleId);
  }
}
