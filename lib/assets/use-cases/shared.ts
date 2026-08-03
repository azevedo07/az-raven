/**
 * Camada de Application do Asset Manager (Sprint 1.6, Task 1) — casos de
 * uso. Um caso de uso representa **uma única ação de negócio**, isolada e
 * testável independentemente das outras. Nenhum caso de uso conhece
 * Prisma, HTTP ou UI — dependem só de `AssetService`, sempre recebido
 * por injeção de dependência via construtor.
 *
 * Deliberadamente não importa nada de `lib/application/use-cases/shared.ts`
 * (o `shared.ts` do Pipeline) — são módulos independentes; um `UseCase<Input,
 * Output>` é uma forma genérica trivial, não uma regra de negócio, então
 * copiá-la aqui não duplica nenhuma regra, só evita acoplar o Asset
 * Manager à Application layer do Pipeline.
 */

/** Contrato comum a todo caso de uso: recebe uma entrada, retorna uma saída. */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}

/** Entrada comum a casos de uso que operam sobre um Asset específico. */
export interface AssetIdInput {
  assetId: string;
}

/** Entrada comum a casos de uso que operam sobre todos os Assets de um projeto. */
export interface ProjectIdInput {
  projectId: string;
}
