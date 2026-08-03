# repositories/

Implementações do Repository Pattern da camada de persistência do
Pipeline Core (Sprint 1.3). Cada repositório encapsula o Prisma Client
(`lib/db/client.ts`) e expõe um contrato do qual o Pipeline Service
depende — nenhum arquivo fora desta pasta (e de `lib/db/`) deve importar
`@prisma/client` diretamente.

Vazio nesta etapa (Task 1 — fundação da persistência). Contratos e
implementações concretas chegam em uma Task futura, junto com as
entidades e a primeira migration.
