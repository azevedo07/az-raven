import { PipelineTimelineEntry } from "../../repositories/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/**
 * Retorna a linha do tempo de eventos do pipeline de um projeto,
 * ordenada cronologicamente, ou `undefined` se o projeto não tiver
 * pipeline inicializado (equivalente a `PipelineService.getTimeline`).
 *
 * `PipelineTimelineEntry` é um tipo de dado puro (Domain Type — a forma
 * de uma entrada da linha do tempo), não a implementação do Repository;
 * importá-lo aqui para tipar a entrada/saída não viola "Use Case conhece
 * só o PipelineService" — é o mesmo princípio já aplicado a `PipelineState`/
 * `ModuleId` nos demais Use Cases.
 */
export interface GetPipelineTimelineUseCase
  extends UseCase<ProjectIdInput, PipelineTimelineEntry[] | undefined> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class GetPipelineTimelineUseCaseImpl implements GetPipelineTimelineUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId }: ProjectIdInput): Promise<PipelineTimelineEntry[] | undefined> {
    return this.pipelineService.getTimeline(projectId);
  }
}
