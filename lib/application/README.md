# application/

Camada de Application da Sprint 1.4 — os **casos de uso** (Use Cases) do
AZ Raven.

## Por que esta camada existe

Até a Sprint 1.3, o `PipelineService` (`lib/pipeline-service/`) acumulava
tanto a orquestração entre `PipelineEngine` e `PipelineRepository` quanto
o começo da lógica de "o que uma ação de negócio faz" (ex.: `startModule`,
`finishModule`). A Sprint 1.4 extrai essa segunda responsabilidade para
casos de uso independentes, cada um com responsabilidade única —
`PipelineService` continua existindo, mas passa a ser consumido *pelos*
casos de uso, não a concentrar a lógica de negócio sozinho.

## Estrutura

```
lib/application/
  use-cases/
    shared.ts                  Contrato genérico UseCase<Input, Output> e tipos de entrada comuns
    startProjectUseCase.ts
    getProjectStateUseCase.ts
    finishModuleUseCase.ts
    runNextModuleUseCase.ts
    pauseProjectUseCase.ts
    resumeProjectUseCase.ts
    cancelProjectUseCase.ts
    index.ts                   Barril de exportação
```

## Regras desta camada

- Nenhum caso de uso conhece Prisma, HTTP ou UI.
- Todo caso de uso depende só de: `PipelineService`, as interfaces de
  Repository (`lib/repositories/types.ts`) e os tipos de domínio
  (`lib/pipeline-core/types.ts`).
- Dependências sempre recebidas por **injeção de construtor** — nunca
  instanciadas dentro da lógica do caso de uso.
- Um caso de uso, uma responsabilidade — sem casos de uso "genéricos"
  que fazem várias coisas.

## Estado atual (Task 1 da Sprint 1.4)

Só os **contratos** (interfaces) existem — nenhuma lógica implementada.
As implementações concretas (`StartProjectUseCaseImpl` e equivalentes),
que efetivamente chamam o `PipelineService`, chegam na Task 2.
