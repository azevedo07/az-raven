import { ModuleId } from "../../pipeline-core/types";

/**
 * Camada de Application (Sprint 1.4) — casos de uso.
 *
 * Um caso de uso representa **uma única ação de negócio**, isolada e
 * testável independentemente das outras. Nenhum caso de uso conhece
 * Prisma, HTTP ou UI — dependem só de `PipelineService`, das interfaces
 * de Repository (`lib/repositories/types.ts`) e dos tipos de domínio
 * (`lib/pipeline-core/types.ts`), sempre recebidos por injeção de
 * dependência via construtor (ver `lib/application/README.md`).
 *
 * Esta Task cobre só os contratos abaixo — nenhuma implementação ainda.
 */

/** Contrato comum a todo caso de uso: recebe uma entrada, retorna uma saída. */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}

/** Entrada comum a casos de uso que operam sobre um projeto inteiro. */
export interface ProjectIdInput {
  projectId: string;
}

/** Entrada comum a casos de uso que operam sobre um módulo específico de um projeto. */
export interface ModuleActionInput extends ProjectIdInput {
  moduleId: ModuleId;
}
