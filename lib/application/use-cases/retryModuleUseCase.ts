import { PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ModuleActionInput, UseCase } from "./shared";

/**
 * Reinicia um módulo que falhou no pipeline de um projeto, voltando-o
 * para "pending" (equivalente a `PipelineEngine.retryModule`, orquestrado
 * através do `PipelineService`). Não reinicia a execução sozinho — quem
 * efetivamente reexecuta é `StartModuleUseCase`/`RunNextModuleUseCase`,
 * exatamente como já documentado no próprio `PipelineEngine`.
 */
export interface RetryModuleUseCase extends UseCase<ModuleActionInput, PipelineState> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case. Nenhuma regra de negócio aqui: quem decide se a transição para
 * "pending" é válida (só a partir de "error") continua sendo o
 * `PipelineEngine`, através do `PipelineService`.
 */
export class RetryModuleUseCaseImpl implements RetryModuleUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId, moduleId }: ModuleActionInput): Promise<PipelineState> {
    return this.pipelineService.retryModule(projectId, moduleId);
  }
}
