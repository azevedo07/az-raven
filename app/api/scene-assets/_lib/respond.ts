import { NextResponse } from "next/server";

/**
 * Pasta com prefixo `_` — excluída do roteamento pelo App Router. Mesmo
 * padrão de `app/api/assets/_lib/respond.ts` e `app/api/pipeline/_lib/respond.ts`.
 * Não conhece Use Cases, Service, Repository ou Prisma — só formata `NextResponse`.
 */

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** 500 genérico — nunca inclui `error.message`/stack do erro original na resposta; loga no servidor via `console.error`. */
export function internalErrorResponse(context: string, error: unknown) {
  console.error(`[api/scene-assets] ${context}:`, error);
  return errorResponse(500, "INTERNAL_ERROR", "Erro interno do servidor.");
}
