import { PipelineEngine } from "./engine";
import { moduleRegistry } from "./registry";
import { ExecutionStatus, ModuleId } from "./types";
import { PipelineModule, PipelineStatus } from "../types";

/**
 * Camada de estado do Pipeline Core: instancia e conduz o `PipelineEngine`
 * do projeto de demonstração e traduz seu estado para o formato
 * `PipelineModule[]` já consumido por `components/PipelineStep.tsx` e
 * `app/production/page.tsx`.
 *
 * `status` e `pct` vêm sempre do `PipelineEngine` — nunca são inventados
 * aqui. `description`/`eta` ainda são conteúdo de apresentação estático
 * por módulo, a mesma informação hoje hardcoded em `lib/data.ts`, porque a
 * Sprint 1.1 cobre apenas o motor de execução, não a geração real de
 * conteúdo por IA (isso é integração futura).
 *
 * Persistência real (sobreviver a um restart do processo) é a Sprint 1.3
 * — ver `docs/ROADMAP.md`. Por ora, cada engine vive em memória durante o
 * tempo de vida do processo, na mesma premissa que os arrays mockados que
 * este módulo substitui.
 */

interface ModuleContent {
  description: string;
  eta: string;
}

/** Conteúdo de apresentação por módulo do projeto de demonstração "O Corvo". */
const O_CORVO_CONTENT: Record<ModuleId, ModuleContent> = {
  "literary-director": { description: "Tema, emoções e conflito narrativo mapeados.", eta: "Concluído" },
  "emotion-engine": { description: "Arco emocional calibrado cena a cena.", eta: "Concluído" },
  "character-engine": { description: "Fichas completas do Narrador, do Corvo e de Lenora.", eta: "Concluído" },
  "world-builder": { description: "World Bible com 10 categorias sensoriais.", eta: "Concluído" },
  storyboard: { description: "6 cenas cinematográficas aprovadas.", eta: "Concluído" },
  "director-engine": { description: "Lentes, luz e composição definidas por cena.", eta: "Concluído" },
  "prompt-builder": { description: "Prompts de imagem, vídeo, áudio e trilha gerados.", eta: "Concluído" },
  assets: { description: "Renderizações organizadas na biblioteca visual.", eta: "Concluído" },
  production: { description: "Renderização de imagem em andamento — 3 de 6 cenas.", eta: "~2h restantes" },
  "quality-director": { description: "Auditoria cinematográfica final — 10 categorias.", eta: "Estimado: 15min" },
  "audience-intelligence": { description: "Estratégia de publicação e Thumbnail Studio.", eta: "Estimado: 15min" },
  export: { description: "Empacotamento do filme completo para entrega.", eta: "Estimado: 20min" },
};

/**
 * Módulos já concluídos no projeto de demonstração, na ordem exigida pela
 * cadeia linear do registry (cada um só termina depois do anterior).
 * `production` fica de fora de propósito: é o módulo em andamento.
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

/**
 * Traduz o status interno do engine (`ExecutionStatus`) para o vocabulário
 * que a UI já entende (`PipelineStatus`, sem o estado "error").
 */
const EXECUTION_TO_UI_STATUS: Record<ExecutionStatus, PipelineStatus> = {
  pending: "pending",
  active: "active",
  done: "done",
  // A UI ainda não tem uma tela/estado visual para módulo com falha —
  // "pending" é a aproximação mais segura até essa tela existir.
  error: "pending",
};

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

const oCorvoEngine = createOCorvoEngine();

/**
 * Estado atual do pipeline do projeto de demonstração no formato
 * consumido pela UI. Chamar isto sempre que a UI precisar do estado mais
 * recente — não cacheie o retorno além do ciclo de renderização atual.
 */
export function getPipelineModules(): PipelineModule[] {
  const state = oCorvoEngine.getState();
  return moduleRegistry.map((definition) => {
    const executionState = state.modules[definition.id];
    const content = O_CORVO_CONTENT[definition.id];
    return {
      title: definition.title,
      status: EXECUTION_TO_UI_STATUS[executionState.status],
      description: content.description,
      pct: executionState.pct,
      eta: content.eta,
    };
  });
}
