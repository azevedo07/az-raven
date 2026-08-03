import { pipelineService } from "../application/container";
import { moduleRegistry } from "./registry";
import { ExecutionStatus, ModuleId } from "./types";
import { PipelineModule, PipelineStatus } from "../types";

/**
 * Adaptador do lado do servidor para a UI existente (`lib/data.ts` →
 * `components/PipelineStep.tsx`, `app/production/page.tsx`).
 *
 * Decisão arquitetural (Sprint 1.2, revisão da Task 3): este arquivo
 * consome o Pipeline Service **diretamente**, por chamada de função —
 * não via HTTP. A API (`app/api/pipeline`) continua existindo, mas como
 * a única interface para consumidores externos (browser, mobile,
 * integrações futuras); um Server Component chamando sua própria rota
 * via `fetch` é um round-trip de rede desnecessário que o próprio
 * Next.js App Router desaconselha.
 *
 *   UI (app/, components/) → lib/data.ts → store.ts (este arquivo) → Pipeline Service → Pipeline Engine → Registry
 *   Consumidor externo (browser/mobile/integração) → API → Pipeline Service → Pipeline Engine → Registry
 *
 * Regra do projeto: componentes de UI (`app/`, `components/`) nunca
 * importam Pipeline Service, Pipeline Engine ou Registry — só este
 * adaptador tem essa permissão.
 *
 * O que este arquivo faz é só tradução para a UI: pega o estado de
 * execução real (`status`/`pct`) do Service e o combina com metadado
 * estático do `registry` (`title`/ordem) e com conteúdo de apresentação
 * ainda fixo por módulo (`description`/`eta` — a mesma informação hoje
 * hardcoded, porque a Sprint 1.1/1.2 cobrem o motor de execução e a API,
 * não a geração real de conteúdo por IA).
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

const O_CORVO_PROJECT_ID = "o-corvo";

/**
 * Estado atual do pipeline do projeto de demonstração no formato
 * consumido pela UI. Chamar isto sempre que a UI precisar do estado mais
 * recente — não cacheie o retorno além do ciclo de renderização atual.
 *
 * Lê o estado de execução direto do Pipeline Service (nunca do Engine
 * ou do Repository) e o combina com `title`/ordem do `registry` —
 * leitura de metadado estático, não lógica de negócio.
 */
export async function getPipelineModules(): Promise<PipelineModule[]> {
  const state = await pipelineService.getPipelineState(O_CORVO_PROJECT_ID);
  if (!state) {
    return [];
  }

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
