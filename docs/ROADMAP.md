# Roadmap

> Sequência planejada de sprints e versões do AZ Raven, da fundação atual
> até a v1.0 e além.

## Sprint 1 — Pipeline Core

| Sprint | Escopo | Status |
|---|---|---|
| 1.1 | Pipeline Core: contratos de tipo, registry dos 12 módulos, motor de execução (`PipelineEngine`) e camada de estado por projeto, substituindo os dados mockados de `lib/data.ts`. | Concluída |
| 1.2 | Pipeline Service (`lib/pipeline-service`) e API interna (`app/api/pipeline`) para consumidores externos; `store.ts` reconfigurado como Server Adapter que consome o Service diretamente (não via HTTP); arquitetura de camadas protegida por teste automatizado (Vitest). | Concluída |
| 1.3 | **Persistência do Pipeline Engine.** Requisito arquitetural: o `PipelineEngine` precisa de uma API de persistência com, no mínimo, `save()`, `load()`, `serialize()` e `deserialize()`, para que o estado do pipeline sobreviva a reinícios do processo (hoje é só memória, perdido a cada restart). A Sprint 1.1 já prepara o terreno para isso — `getState()`/`getProjectStatus()` expõem dados simples e serializáveis, e `PipelineEngine.fromPersistedState()` é o ponto de entrada de reidratação — mas nenhum desses quatro métodos deve ser implementado antes desta sprint. | Planejada |

*Demais sprints e versões a serem detalhadas conforme o Master Plan evoluir.*
