import "dotenv/config";
import { prisma } from "../lib/db/client";

/**
 * Seed idempotente do projeto de demonstração "O Corvo".
 *
 * Necessário porque `PipelineExecution.projectId` é uma FK obrigatória
 * para `Project.id` — o identificador "o-corvo", hoje usado como mock em
 * `lib/data.ts` e `lib/pipeline-service/pipelineService.ts`, precisa
 * existir de verdade como uma linha de `Project` para que o
 * `PipelineRepository` consiga persistir seu estado.
 *
 * Não é uma `ProjectRepository` — é só dado de bootstrap, rodado uma vez
 * (ou quantas vezes quiser; upsert é seguro).
 */

const DEMO_USER_EMAIL = "demo@azraven.local";
const DEMO_PROJECT_ID = "o-corvo";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL, name: "AZ Raven Demo" },
  });

  const project = await prisma.project.upsert({
    where: { id: DEMO_PROJECT_ID },
    update: {},
    create: {
      id: DEMO_PROJECT_ID,
      ownerId: user.id,
      name: "O Corvo — Edição Cinematográfica",
      author: "Edgar Allan Poe",
      language: "PT-BR",
      objective:
        "Traduzir o luto e a loucura crescente do narrador em linguagem puramente visual.",
    },
  });

  console.log(`Seed concluído: projeto "${project.id}" garantido (owner: ${user.email}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
