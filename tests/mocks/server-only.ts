// Stub usado só pelo Vitest (via alias em vitest.config.ts). O pacote
// real `server-only` lança erro em qualquer execução Node pura fora do
// bundler do Next.js — o próprio webpack do Next.js é quem sabe
// neutralizá-lo em contexto de servidor; o Vitest não. Este stub
// substitui o pacote real só durante os testes.
export {};
