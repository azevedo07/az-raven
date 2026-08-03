import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ModuleActionInput, UseCase } from "./shared";

/**
 * Marca um módulo específico do pipeline de um projeto como falho
 * (equivalente a `PipelineEngine.failModule`, orquestrado através do
 * `PipelineService`).
 */
export interface FailModuleUseCase extends UseCase<ModuleActionInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case. Nenhuma regra de negócio aqui: quem decide se a transição para
 * "error" é válida continua sendo o `PipelineEngine`, através do
 * `PipelineService`.
 */
export class FailModuleUseCaseImpl implements FailModuleUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId, moduleId }: ModuleActionInput): Promise<PipelineState> {
    return this.pipelineService.failModule(projectId, moduleId);
  }
}
