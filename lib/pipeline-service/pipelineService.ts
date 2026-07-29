import { PipelineEngine } from "../pipeline-core/engine";
import { ModuleId, PipelineState } from "../pipeline-core/types";

/**
 * Pipeline Service — camada de orquestração entre consumidores (API,
 * futuramente) e o Pipeline Engine. É a única camada, além do próprio
 * Engine, que importa `lib/pipeline-core/engine.ts` diretamente:
 *
 *   UI → API → Pipeline Service → Pipeline Engine → Registry
 *
 * `lib/pipeline-core/store.ts` NÃO é consumido nem conhecido por este
 * arquivo — é o inverso: o store é um adaptador temporário que consome
 * este Service (ver `store.ts`).
 *
 * Task 1 cobre só a superfície mínima necessária para o store parar de
 * instanciar o Engine por conta própria: um registro de engines por
 * projeto e uma leitura de estado. Ações mutáveis (start/finish/fail/
 * retry/pause/resume/cancel), DTOs formais e tratamento de erro tipado
 * são as Tasks 2 e 3 — ainda não implementadas.
 */

/**
 * Módulos já concluídos no projeto de demonstração "O Corvo", na ordem
 * exigida pela cadeia linear do registry (cada um só termina depois do
 * anterior). `production` fica de fora de propósito: é o módulo em
 * andamento.
 */
const O_CORVO_DONE_MODULES: ModuleId[] = [
  "literary-director",
  "emotion-engine",
  "character-engine",
  "world-builder",
  "storyboard",
  "director-engine",
  "prompt-builder",
  "assets",
];

function createOCorvoEngine(): PipelineEngine {
  const engine = new PipelineEngine("o-corvo");
  engine.startProject();

  for (const moduleId of O_CORVO_DONE_MODULES) {
    if (engine.getState().modules[moduleId].status === "pending") {
      engine.startModule(moduleId);
    }
    engine.finishModule(moduleId);
  }

  engine.startModule("production");

  return engine;
}

/**
 * Registro de engines por projeto, mantido em memória pelo Service
 * (persistência real é a Sprint 1.3 — ver `docs/ROADMAP.md`). Hoje só
 * "o-corvo" tem um engine seedado; pedir o estado de outro projeto
 * retorna `undefined` (ver `getPipelineState`), nunca dado inventado.
 */
const engines = new Map<string, PipelineEngine>([["o-corvo", createOCorvoEngine()]]);

/**
 * Retorna o estado atual do pipeline de um projeto, ou `undefined` se o
 * projeto não tiver um pipeline inicializado. Esta é a única forma de um
 * consumidor ler o estado de execução — nenhum import direto de
 * `PipelineEngine` fora deste arquivo.
 */
export function getPipelineState(projectId: string): PipelineState | undefined {
  return engines.get(projectId)?.getState();
}
