// Configuração do Prisma CLI (migrate/introspect) — modelo introduzido no
// Prisma 7. A URL de conexão vive aqui, não mais em schema.prisma.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
