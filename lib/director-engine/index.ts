/**
 * Barrel do módulo Director Engine (Task "Director Engine Foundation,
 * parte 2"; Use Case de orquestração adicionado na Task "Director
 * Engine — Orquestração"; `CinematicIntent` adicionado na Task
 * "Director Engine — Cinematic Intent"; `CinematicDecision` adicionado
 * na Task "Director Engine — Primeira Camada de Decisão Cinematográfica
 * Determinística"; `CinematicAnalysisReport` adicionado na Task
 * "Director Engine — Relatório Cinematográfico Determinístico por
 * Cena"). Exporta só contratos —
 * `./types` e a forma pura do Use Case (`ProcessSceneWithDirectorInput`/
 * `ProcessSceneWithDirectorUseCase`) — nunca `DirectorEngineImpl` nem
 * `ProcessSceneWithDirectorUseCaseImpl`. Por isso o re-export do Use
 * Case é nomeado (`export type { ... }`), não `export *` de
 * `./use-cases` (que também exporta o `Impl`, mesmo princípio de
 * `lib/scene-assets/use-cases/index.ts`). Um futuro consumidor deve
 * importar a instância composta de `lib/director-engine/container.ts`
 * diretamente, nunca instanciar as implementações fora dali — mesmo
 * princípio de `lib/director-context/index.ts`.
 *
 * `createCinematicIntent`/`createCinematicDecision`/`createCinematicAnalysisReport`
 * são diferentes: são funções puras sem estado, sem composição, sem
 * infraestrutura — não há "implementação escondida" para proteger,
 * então são exportadas diretamente (junto dos tipos
 * `CinematicIntent`/`CinematicDecision`/`CinematicAnalysisReport`), sem
 * passar por `container.ts`.
 */
export * from "./types";
export * from "./cinematicIntent";
export * from "./cinematicDecision";
export * from "./cinematicAnalysisReport";
export type { ProcessSceneWithDirectorInput, ProcessSceneWithDirectorUseCase } from "./use-cases/processSceneWithDirectorUseCase";
