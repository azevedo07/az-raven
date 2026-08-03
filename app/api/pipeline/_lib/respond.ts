import { NextResponse } from "next/server";

/**
 * Pasta com prefixo `_` — o Next.js App Router a exclui do roteamento
 * (não vira uma rota HTTP). Só código auxiliar de resposta, compartilhado
 * pelas rotas de `app/api/pipeline/[projectId]/*` para não repetir o
 * mesmo formato de erro em cada uma.
 *
 * Não conhece Use Cases, PipelineService, Repository, Prisma ou Engine —
 * só formata `NextResponse`.
 */

/**
 * Executa uma ação de um Use Case e converte o resultado (ou uma
 * exceção lançada por ela) numa `NextResponse`. Erros lançados pelo
 * Pipeline Engine/Service (ex.: transição inválida, projeto não
 * encontrado) viram HTTP 409 — tratamento de erro mais fino (404 vs. 409
 * vs. 400 distintos) fica para uma Task futura dedicada a isso.
 */
export async function respondToAction<T>(action: () => Promise<T>, errorCode: string): Promise<Response> {
  try {
    const result = await action();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: errorCode,
          message: error instanceof Error ? error.message : "Erro desconhecido.",
        },
      },
      { status: 409 }
    );
  }
}
