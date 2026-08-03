import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Instância única do Prisma Client para todo o processo.
 *
 * `import "server-only"` faz o build falhar explicitamente (com um erro
 * claro do Next.js) se algum dia um Client Component importar este
 * arquivo — em vez do erro cru de "Module not found: net/tls" que o
 * bundler do navegador dá ao tentar resolver as dependências do `pg`.
 *
 * Prisma 7 exige um driver adapter explícito em runtime (a URL de
 * conexão não é mais lida automaticamente do schema) — usamos
 * `@prisma/adapter-pg`, o adapter genérico para qualquer PostgreSQL
 * (não amarra o projeto a um provedor serverless específico).
 *
 * Em desenvolvimento, o Next.js recarrega módulos a cada mudança de
 * arquivo; sem o cache em `globalThis`, cada hot-reload criaria um novo
 * `PrismaClient` (e uma nova pool de conexões), esgotando as conexões
 * disponíveis do Postgres rapidamente. Padrão recomendado pela própria
 * documentação do Prisma para apps Next.js.
 *
 * Nenhum código fora de `lib/db/` e `lib/repositories/` deve importar
 * `@prisma/client` (ou este arquivo) diretamente — isso é reforçado pela
 * mesma disciplina de fronteira de camadas já testada em
 * `tests/architecture/layer-boundaries.test.ts`.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
