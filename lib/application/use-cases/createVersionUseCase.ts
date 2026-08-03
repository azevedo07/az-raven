import { PipelineVersionSummary } from "../../repositories/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/** Entrada de `CreateVersionUseCase`: projeto alvo + nome da versão. */
export interface CreateVersionInput extends ProjectIdInput {
  name: string;
}

/**
 * Cria uma versão (snapshot) do pipeline de um projeto, ou `undefined` se
 * o projeto não tiver pipeline inicializado (equivalente a
 * `PipelineService.createVersion`).
 */
export interface CreateVersionUseCase extends UseCase<CreateVersionInput, PipelineVersionSummary | undefined> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class CreateVersionUseCaseImpl implements CreateVersionUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId, name }: CreateVersionInput): Promise<PipelineVersionSummary | undefined> {
    return this.pipelineService.createVersion(projectId, name);
  }
}
