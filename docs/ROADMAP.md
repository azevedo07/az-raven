# Roadmap

> Sequência planejada de sprints e versões do AZ Raven, da fundação atual
> até a v1.0 e além. Sprints concluídas têm escopo final registrado;
> sprints futuras têm objetivo e entregáveis planejados, sujeitos a
> refinamento no início de cada uma (como já aconteceu com a própria
> Sprint 1.3).

## Sprint 1.1 — Pipeline Core Foundation ✅

**Objetivo:** fundação do motor de execução do pipeline de produção.

**Entregáveis:**
- Contratos de tipo (`lib/pipeline-core/types.ts`).
- Registry dos 12 módulos oficiais, em cadeia de dependência linear
  (`lib/pipeline-core/registry.ts`).
- Motor de execução determinístico com máquina de estados e eventos
  (`lib/pipeline-core/engine.ts`) — ver ADR-0001.
- Camada de estado por projeto (`lib/pipeline-core/store.ts`),
  substituindo os dados mockados de `lib/data.ts`.

**Critérios de conclusão:** `PipelineEngine` cobre o ciclo de vida
completo de um projeto (start/finish/fail/retry/pause/resume/cancel) em
memória, com testes cobrindo o motor.

## Sprint 1.2 — Pipeline Service + API interna ✅

**Objetivo:** expor o Pipeline Core através de uma camada de
orquestração e de uma API interna, mantendo a arquitetura desacoplada.

**Entregáveis:**
- `PipelineService` (`lib/pipeline-service/pipelineService.ts`).
- API interna `GET /api/pipeline/:projectId` (`app/api/pipeline`).
- `store.ts` reconfigurado como Server Adapter que consome o Service
  diretamente (não via HTTP — ver ADR-0004).
- Vitest configurado como framework de testes oficial; suíte de
  fronteira de arquitetura (`tests/architecture/layer-boundaries.test.ts`).

**Critérios de conclusão:** UI e API convergem no mesmo Service; nenhuma
camada acessa Engine/Registry indevidamente (verificado por teste
automatizado).

## Sprint 1.3 — Persistência (Prisma + PostgreSQL) ✅

**Objetivo:** persistência real do estado do pipeline, sobrevivendo a
reinícios do processo e preparada para escala horizontal.

**Entregáveis:**
- PostgreSQL via Docker Compose; Prisma 7 configurado
  (`prisma/schema.prisma`, `prisma.config.ts`).
- Schema com 7 entidades: `User`, `Project`, `PipelineExecution`,
  `ModuleExecution`, `PipelineEvent`, `Version`, `AuditLog`.
- Repository Pattern (`PipelineRepository` + `PrismaPipelineRepository`)
  — ver ADR-0002 e ADR-0003.
- `PipelineService` integrado ao Repository via injeção de dependência,
  sem mais estado em memória entre chamadas — ver ADR-0004.
- Correção da fronteira Server/Client Component com `server-only` — ver
  ADR-0005.
- Consolidação arquitetural: ADRs, diagrama oficial e regras de
  dependência em `docs/architecture/`.

**Critérios de conclusão:** ciclo completo (criar → persistir →
recarregar → transicionar → persistir → determinismo) validado contra
PostgreSQL real; `npm test`, `npx tsc --noEmit` e `npm run build` limpos.

## Sprint 1.4 — Use Cases

**Objetivo:** completar a superfície de casos de uso do Pipeline
Service e expô-la via API, cobrindo o ciclo de vida inteiro do pipeline
(hoje só `getPipelineState`/`startModule`/`finishModule` existem).

**Entregáveis planejados:**
- Métodos do `PipelineService` para `failModule`, `retryModule`,
  `pauseProject`, `resumeProject`, `cancelProject`.
- Rotas de API correspondentes (`POST /api/pipeline/:projectId/...`),
  com tratamento de erro tipado (ex.: `INVALID_TRANSITION` → 409).
- Testes cobrindo cada caso de uso, incluindo cenários de erro.

**Critérios de conclusão:** todo o ciclo de vida do pipeline
(`ProjectPipelineStatus` e `ExecutionStatus` completos) controlável via
API, com respostas de erro claras e testadas.

## Sprint 1.5 — Version System

**Objetivo:** ativar a entidade `Version` (já no schema desde a Sprint
1.3) para snapshots, histórico e rollback reais de projetos.

**Entregáveis planejados:**
- Repository e casos de uso para criar/listar/restaurar versões.
- Estratégia de snapshot (o que exatamente compõe uma versão completa
  de um projeto).
- Trilha de decisão sobre quando uma versão é criada (manual vs.
  automática em marcos do pipeline).

**Critérios de conclusão:** um projeto pode ser restaurado a um estado
salvo anterior, com histórico consultável.

## Sprint 1.6 — Prompt Engine

**Objetivo:** substituir os prompts hoje mockados
(`lib/data.ts` → `promptCategories`) por geração real, integrada a
provedores de IA.

**Entregáveis planejados:**
- Abstração de provedor de IA (permitindo múltiplos provedores, por
  desenho do produto).
- Persistência dos prompts gerados por cena/módulo.

**Critérios de conclusão:** prompts de imagem/vídeo/áudio/narração/trilha
gerados a partir de dados reais do projeto, não texto estático.

## Sprint 1.7 — World Bible

**Objetivo:** persistência e geração real do World Bible (hoje mockado
em `lib/data.ts` → `worldBible`).

**Entregáveis planejados:** entidade e repository de World Bible;
geração assistida por IA das categorias sensoriais do universo da obra.

**Critérios de conclusão:** World Builder operando sobre dados reais
por projeto, não um único exemplo fixo.

## Sprint 1.8 — Character Engine

**Objetivo:** persistência e geração real de fichas de personagem (hoje
mockadas em `lib/data.ts` → `characters`).

**Entregáveis planejados:** entidade e repository de personagens;
geração assistida por IA das fichas (objetivo, conflito, transformação
etc.).

**Critérios de conclusão:** Character Engine operando sobre dados reais
por projeto.

## Sprint 1.9 — Scene Engine

**Objetivo:** persistência real de cenas e Storyboard (hoje mockado em
`lib/data.ts` → `scenes`).

**Entregáveis planejados:** entidade e repository de cenas; ligação
entre Emotion Engine, Character Engine e World Builder na composição de
cada cena.

**Critérios de conclusão:** Storyboard gerado e persistido por projeto,
não um exemplo fixo de 6 cenas.

## Sprint 2.0 — Director Engine

**Objetivo:** fechar o pipeline de Direção Criativa com decisões
cinematográficas reais e geradas (lentes, luz, composição, ritmo),
marcando a maturidade do fluxo completo Literary Director → Emotion
Engine → Character Engine → World Builder → Storyboard → Director
Engine sobre dados reais, de ponta a ponta.

**Entregáveis planejados:** geração assistida por IA das decisões de
direção, com justificativa explícita ligada ao Emotion Engine (mantendo
o princípio de explicabilidade do produto).

**Critérios de conclusão:** um projeto pode percorrer todo o pipeline de
Direção Criativa com decisões reais, explicáveis e persistidas — não
mais dados de demonstração.
