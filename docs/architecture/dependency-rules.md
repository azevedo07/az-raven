# Regras de Dependência — Pipeline Core

> Regras obrigatórias de importação entre as camadas do Pipeline Core.
> Onde existe verificação automatizada, ela está referenciada — estas
> regras não são apenas convenção documentada, a maioria é imposta por
> teste (`tests/architecture/layer-boundaries.test.ts`) a cada `npm test`.

## Regras

| # | Regra | Por quê | Verificação |
|---|---|---|---|
| 1 | `PipelineEngine` nunca importa Prisma. | O Engine é uma máquina de estados pura (ADR-0001); acoplar a uma tecnologia de persistência quebraria testabilidade e determinismo. | Inspeção manual do import graph — `engine.ts` só importa `./registry` e `./types` (ver `system-architecture.md`, seção 4). |
| 2 | `PipelineEngine` nunca acessa banco de dados. | Idem — nenhuma operação de I/O dentro do Engine. | Mesmo que acima; ausência de qualquer `await`/chamada de rede em `engine.ts`. |
| 3 | `PipelineEngine` nunca conhece `Repository`. | O Engine não sabe como (nem se) seu estado é persistido — isso é responsabilidade do `PipelineService`. | Idem. |
| 4 | `Repository` nunca contém regra de negócio do pipeline. | O Repository só traduz entre o formato de domínio (`PipelineState`) e as tabelas do Prisma — validação de transição continua exclusiva do Engine. | Revisão manual de `lib/repositories/pipelineRepository.ts` (única lógica não-trivial: a convenção de "execução mais recente", documentada e sinalizada como provisória em ADR-0003). |
| 5 | `PipelineService` é o único orquestrador entre Engine e Repository. | Evita lógica de seed/persistência duplicada entre os consumidores (UI via `store.ts`, API externa). | `grep` confirma: só `pipelineService.ts` importa tanto `pipeline-core/engine` quanto `repositories/pipelineRepository`. |
| 6 | `PipelineService` é o único consumidor de `PrismaPipelineRepository`. | Mantém a composição (injeção de dependência) centralizada em um único ponto. | Confirmado nesta auditoria — nenhum outro arquivo importa `PrismaPipelineRepository` como símbolo (só a própria definição da classe e referências em comentário). |
| 7 | UI (`app/`, exceto `app/api`, e `components/`) nunca acessa `Repository`, `PipelineEngine` ou `Registry` diretamente. | A UI só deve depender do `store.ts` (adaptador) ou da API — nunca de infraestrutura interna. | `tests/architecture/layer-boundaries.test.ts`, teste 1. |
| 8 | Rotas de API (`app/api`) nunca acessam `Prisma`/`PipelineEngine`/`Registry` diretamente. | Rotas só falam com `PipelineService` — a mesma disciplina de camadas vale para consumidores HTTP. | `tests/architecture/layer-boundaries.test.ts`, teste 2. |
| 9 | Somente o Repository (e `lib/db/client.ts`) conhece Prisma. | Contém o custo de uma eventual troca de ORM a `lib/repositories/` (ADR-0002). | `tests/architecture/layer-boundaries.test.ts`, testes 3 e 4; reforçado em runtime por `import "server-only"` (ADR-0005). |
| 10 | `store.ts` (Server Adapter) é o único ponto da UI que importa o Pipeline Service. | Único ponto de entrada da UI existente para o pipeline — sem duplicar a lógica de composição em múltiplos componentes. | `tests/architecture/layer-boundaries.test.ts`, teste 5. |
| 11 | Nenhum Client Component (`"use client"`) importa, direta ou transitivamente, código que dependa de `@prisma/client`/`pg`. | `pg` depende de módulos Node-only (`net`, `tls`) que não existem no bundle do navegador — violar isso quebra o build. | `import "server-only"` em `lib/db/client.ts`, `lib/repositories/pipelineRepository.ts` e `lib/pipeline-service/pipelineService.ts` (ADR-0005); `lib/data.ts` não re-exporta mais nada do Pipeline Core. |
| 12 | Nenhuma dependência circular entre as camadas. | Ciclos de import tornam o grafo de dependência difícil de raciocinar e podem causar bugs sutis de inicialização. | Confirmado nesta auditoria: nenhum arquivo em `lib/repositories/` ou `lib/db/` importa `lib/pipeline-service/`. |

## Direção permitida (resumo)

```
UI (app/, exceto app/api, e components/)
  → store.ts (Server Adapter)  OU  app/api/pipeline (Route Handler)
    → PipelineService
      → PipelineEngine → Registry
      → PipelineRepository (interface)
        → PrismaPipelineRepository
          → Prisma Client (lib/db/client.ts)
            → PostgreSQL
```

Nenhuma camada pula a que está logo abaixo dela. Nenhuma seta acima
aponta na direção contrária.
