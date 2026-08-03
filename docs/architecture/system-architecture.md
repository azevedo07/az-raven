# Arquitetura do Sistema — AZ Raven Pipeline Core

> Este documento representa a arquitetura **real e atual** do Pipeline
> Core (Sprints 1.1–1.3), não um plano aspiracional. Ver os ADRs em
> `docs/architecture/adr/` para o raciocínio por trás de cada decisão, e
> `docs/architecture/dependency-rules.md` para as regras de dependência
> derivadas deste desenho.

## 1. Visão geral — os dois caminhos até o Pipeline Service

Existem **dois consumidores** do pipeline hoje, e os dois convergem no
mesmo `PipelineService` — nenhuma lógica de orquestração é duplicada
entre eles.

```mermaid
flowchart TD
    subgraph Consumidores
        UI["UI existente<br/>(app/production, components/)"]
        External["Consumidor externo<br/>(browser, mobile, integrações futuras)"]
    end

    Store["store.ts<br/>(Server Adapter)"]
    API["app/api/pipeline/:projectId<br/>(Route Handler)"]
    Service["PipelineService"]

    UI --> Store
    Store -->|"chamada de função,<br/>sem HTTP"| Service
    External -->|"HTTP"| API
    API --> Service

    Service --> Engine["PipelineEngine"]
    Service --> Repo["PipelineRepository<br/>(interface)"]

    Repo -.->|"implementado por"| PrismaRepo["PrismaPipelineRepository"]
    PrismaRepo --> PrismaClient["Prisma Client<br/>(lib/db/client.ts)"]
    PrismaClient --> Postgres[("PostgreSQL")]

    Engine --> Registry["Module Registry<br/>(12 módulos, cadeia linear)"]

    classDef frozen fill:#2a2115,stroke:#D4AF37,color:#fff;
    class Engine,Registry frozen;
```

**Por que dois caminhos, uma única orquestração:** `store.ts` existe
porque um Server Component chamando sua própria rota de API via
`fetch()` é um round-trip de rede desnecessário (o próprio Next.js App
Router desaconselha isso). A API HTTP continua existindo, intacta, como
a única porta para consumidores que realmente estão fora do processo
Next.js.

## 2. Zoom — dentro do Pipeline Engine

```mermaid
flowchart TD
    Service2["PipelineService"] --> Engine2["PipelineEngine"]
    Engine2 --> StateMachine["Máquina de estados<br/>(startModule, finishModule,<br/>failModule, retryModule,<br/>pauseProject, resumeProject,<br/>cancelProject, validateTransition)"]
    Engine2 --> Registry2["Module Registry<br/>(12 módulos oficiais,<br/>dependência linear)"]
    Engine2 --> Events["Eventos<br/>(subscribe/emit)"]

    StateMachine -.->|"NÃO conhece"| Prisma2["Prisma"]
    StateMachine -.->|"NÃO conhece"| DB2["PostgreSQL"]
    StateMachine -.->|"NÃO conhece"| Repo2["Repository"]
    StateMachine -.->|"NÃO conhece"| API2["API"]
    StateMachine -.->|"NÃO conhece"| UI2["UI"]

    classDef frozen fill:#2a2115,stroke:#D4AF37,color:#fff;
    classDef forbidden fill:#1a1420,stroke:#E0605A,color:#E0605A,stroke-dasharray: 4 2;
    class Engine2,StateMachine,Registry2,Events frozen;
    class Prisma2,DB2,Repo2,API2,UI2 forbidden;
```

O `PipelineEngine` (`lib/pipeline-core/engine.ts`) e o `Registry`
(`lib/pipeline-core/registry.ts`) são arquivos **congelados** desde a
Sprint 1.1 — nenhuma Task de persistência, API ou UI jamais os alterou.
Ver ADR-0001.

## 3. Fluxo de persistência, em detalhe

```mermaid
sequenceDiagram
    participant S as PipelineService
    participant R as PipelineRepository
    participant PR as PrismaPipelineRepository
    participant DB as PostgreSQL

    S->>R: findState(projectId)
    R->>PR: (implementação real)
    PR->>DB: SELECT PipelineExecution + ModuleExecution
    DB-->>PR: linhas
    PR-->>S: PersistedPipelineState | undefined

    Note over S: PipelineEngine.fromPersistedState(...)<br/>reidrata o engine em memória

    S->>S: engine.finishModule(moduleId)<br/>(lógica pura, em memória)

    S->>R: saveState(projectId, state, status)
    R->>PR: (implementação real)
    PR->>DB: UPSERT PipelineExecution + ModuleExecution

    S->>R: appendEvent(projectId, event)
    R->>PR: (implementação real)
    PR->>DB: INSERT PipelineEvent
```

## 4. O que o Pipeline Engine explicitamente NÃO conhece

| Não conhece | Onde essa fronteira é garantida |
|---|---|
| Prisma | `engine.ts` nunca importa `@prisma/client`; único import de módulo externo em todo o arquivo é `./registry` e `./types` |
| Banco de dados | Nenhuma operação de I/O em `engine.ts` — puramente síncrono |
| Repository | `engine.ts` não importa nada de `lib/repositories/` |
| API | `engine.ts` não importa nada de `next/server` nem de `app/` |
| UI | `engine.ts` não importa nada de `app/`, `components/` ou React |

Todas as afirmações acima são verificadas automaticamente por
`tests/architecture/layer-boundaries.test.ts` a cada `npm test`.
