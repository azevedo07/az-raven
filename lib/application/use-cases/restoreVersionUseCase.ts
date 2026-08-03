import { PersistedPipelineState } from "../../repositories/types";
import { PipelineService } from "../../pipeline-service/pipelineService";
import { ProjectIdInput, UseCase } from "./shared";

/** Entrada de `RestoreVersionUseCase`: projeto alvo + versão a restaurar. */
export interface RestoreVersionInput extends ProjectIdInput {
  versionId: string;
}

/**
 * Restaura o pipeline de um projeto para o snapshot de uma versão salva,
 * ou `undefined` se a versão não existir (equivalente a
 * `PipelineService.restoreVersion`).
 */
export interface RestoreVersionUseCase extends UseCase<RestoreVersionInput, PersistedPipelineState | undefined> {}

/**
 * Implementação concreta. Depende só do `PipelineService`, injetado via
 * construtor — nunca instancia o Repository, nunca chama outro Use Case.
 * Nenhuma regra de negócio: só repassa a chamada.
 */
export class RestoreVersionUseCaseImpl implements RestoreVersionUseCase {
  constructor(private readonly pipelineService: PipelineService) {}

  async execute({ projectId, versionId }: RestoreVersionInput): Promise<PersistedPipelineState | undefined> {
    return this.pipelineService.restoreVersion(projectId, versionId);
  }
}
