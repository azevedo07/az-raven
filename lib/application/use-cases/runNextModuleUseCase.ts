import { ModuleId, PipelineState } from "../../pipeline-core/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Saída de `RunNextModuleUseCase`: o estado resultante, e qual módulo foi
 * de fato iniciado — `null` se nenhum módulo estava disponível para
 * iniciar (ex.: pipeline pausado, ou nenhuma dependência satisfeita).
 */
export interface RunNextModuleOutput {
  state: PipelineState;
  startedModuleId: ModuleId | null;
}

/**
 * Identifica o próximo módulo disponível do pipeline de um projeto
 * (equivalente a consultar `PipelineEngine.getAvailableModules` e iniciar
 * o primeiro resultado) e o inicia. Dado que o registry define uma
 * cadeia estritamente linear, no máximo um módulo pode estar disponível
 * por vez.
 */
export interface RunNextModuleUseCase extends UseCase<ProjectIdInput, RunNextModuleOutput> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instanciado internamente, nunca chama outro Use
 * Case. Não reimplementa a regra de dependência do registry: só consulta
 * `getAvailableModules` (que delega ao Engine) e, se houver um módulo
 * disponível, inicia via `startModule`.
 */
export class RunNextModuleUseCaseImpl implements RunNextModuleUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<RunNextModuleOutput> {
    const availableModules = await this.pipelineService.getAvailableModules(projectId);
    const [nextModuleId] = availableModules;

    if (!nextModuleId) {
      const state = await this.pipelineService.getPipelineState(projectId);
      if (!state) {
        throw new Error(`Projeto "${projectId}" não encontrado — nenhum pipeline inicializado.`);
      }
      return { state, startedModuleId: null };
    }

    const state = await this.pipelineService.startModule(projectId, nextModuleId);
    return { state, startedModuleId: nextModuleId };
  }
}
