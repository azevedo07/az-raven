import { NextResponse } from "next/server";

/**
 * Pasta com prefixo `_` — o Next.js App Router a exclui do roteamento
 * (não vira uma rota HTTP). Só código auxiliar de resposta, compartilhado
 * pelas rotas de `app/api/assets/*` para não repetir o mesmo formato de
 * erro em cada uma. Mesmo padrão de `app/api/pipeline/_lib/respond.ts`.
 *
 * Não conhece Use Cases, AssetService, Repository, Storage ou Prisma —
 * só formata `NextResponse`.
 */

/** Envelope de erro padrão: `{ error: { code, message } }`, mesmo formato usado nas rotas do Pipeline. */
export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Resposta 500 genérica — nunca inclui `error.message`/stack do erro
 * original na resposta (isso vazaria detalhes internos para o cliente).
 * O erro real é logado no servidor via `console.error`, nunca exposto.
 */
export function internalErrorResponse(context: string, error: unknown) {
  console.error(`[api/assets] ${context}:`, error);
  return errorResponse(500, "INTERNAL_ERROR", "Erro interno do servidor.");
}
