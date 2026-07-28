/**
 * Pipeline Core — contratos de tipo.
 *
 * Esta camada é agnóstica de apresentação: não importa nada de React,
 * Next.js ou dos componentes de UI. Os tipos aqui descrevem o pipeline de
 * produção como uma máquina de estados pura, independente de qual motor de
 * IA executa cada módulo (isso é integração futura, fora do escopo da
 * Sprint 1.1).
 *
 * Os 12 módulos e sua ordem seguem a Seção 5 do
 * `docs/MASTER_SPECIFICATION.md` e o array `pipelineModules` hoje mockado
 * em `lib/data.ts` — os mesmos módulos, os mesmos IDs, nenhuma invenção de
 * nomenclatura nova.
 */

export type ModuleId =
  | "literary-director"
  | "emotion-engine"
  | "character-engine"
  | "world-builder"
  | "storyboard"
  | "director-engine"
  | "prompt-builder"
  | "assets"
  | "production"
  | "quality-director"
  | "audience-intelligence"
  | "export";

/**
 * Estado de execução interno do Core. É um superconjunto do
 * `PipelineStatus` já usado pela UI (`lib/types.ts`), que só conhece
 * "done" | "active" | "pending". O estado "error" existe aqui porque o
 * motor de execução (Task 3) precisa representar falha de um módulo; a
 * tradução para o vocabulário da UI é responsabilidade da camada de
 * estado (Task 4), não deste arquivo.
 */
export type ExecutionStatus = "pending" | "active" | "done" | "error";

/**
 * Definição estática de um módulo do pipeline: quem ele é e do que
 * depende. Não carrega nenhum dado específico de projeto (isso vive em
 * `ModuleExecutionState`).
 */
export interface ModuleDefinition {
  /** Identificador estável do módulo, usado como chave em todo o Core. */
  id: ModuleId;
  /** Posição canônica no pipeline, 1-indexada, conforme Seção 5 do Master Spec. */
  order: number;
  /** Nome de exibição do módulo (ex.: "Literary Director"). */
  title: string;
  /** Módulos que precisam estar em status "done" antes deste poder iniciar. */
  dependsOn: ModuleId[];
}

/**
 * Estado de execução de um módulo dentro de um projeto específico.
 */
export interface ModuleExecutionState {
  /** Módulo ao qual este estado pertence — deve existir no registry (Task 2). */
  moduleId: ModuleId;
  /** Status atual do módulo dentro do projeto. */
  status: ExecutionStatus;
  /** Progresso percentual do módulo, 0-100. */
  pct: number;
  /** Estimativa textual de conclusão, mesmo formato usado hoje na UI (ex.: "~40min restantes"). */
  eta: string;
  /** Descrição contextual do que o módulo está fazendo ou entregou, exibida na UI. */
  description: string;
}

/**
 * Estado completo do pipeline de um projeto: um `ModuleExecutionState`
 * por módulo definido no registry (Task 2).
 */
export interface PipelineState {
  /** Identificador do projeto ao qual este estado de pipeline pertence. */
  projectId: string;
  /** Estado de execução de cada módulo, indexado por `ModuleId`. */
  modules: Record<ModuleId, ModuleExecutionState>;
}

/**
 * Resumo agregado do pipeline de um projeto, usado por telas que só
 * precisam do progresso geral (ex.: Home, Biblioteca).
 */
export interface PipelineSummary {
  /** Identificador do projeto ao qual este resumo pertence. */
  projectId: string;
  /** Progresso geral do pipeline, 0-100, agregado a partir de todos os módulos. */
  overallProgress: number;
  /** Quantidade de módulos com status "done". */
  doneCount: number;
  /** Quantidade total de módulos no pipeline. */
  totalCount: number;
}

/**
 * Status de um projeto no pipeline como um todo — distinto do status de
 * cada módulo individual (`ExecutionStatus`). Controlado pelo
 * `PipelineEngine` (Task 3) via `startProject`, `pauseProject`,
 * `resumeProject` e `cancelProject`.
 */
export type ProjectPipelineStatus = "idle" | "running" | "paused" | "cancelled" | "completed";

/**
 * Resultado de uma verificação de transição feita por
 * `PipelineEngine.validateTransition`, sem efeitos colaterais.
 */
export interface TransitionCheck {
  /** Verdadeiro se a transição é permitida no estado atual. */
  valid: boolean;
  /** Motivo legível da rejeição, presente apenas quando `valid` é `false`. */
  reason?: string;
}

/**
 * Evento emitido pelo `PipelineEngine` após cada transição bem-sucedida.
 *
 * Existe para que camadas futuras (persistência, API, notificações —
 * fora do escopo da Sprint 1.1) possam reagir a mudanças de estado sem
 * que o engine precise conhecê-las. O engine nunca lê seu próprio estado
 * de volta a partir de um evento; eventos são somente para observação.
 */
export type PipelineEngineEvent =
  | { type: "project-started"; projectId: string }
  | { type: "project-paused"; projectId: string }
  | { type: "project-resumed"; projectId: string }
  | { type: "project-cancelled"; projectId: string }
  | { type: "project-completed"; projectId: string }
  | { type: "module-started"; projectId: string; moduleId: ModuleId }
  | { type: "module-finished"; projectId: string; moduleId: ModuleId }
  | { type: "module-failed"; projectId: string; moduleId: ModuleId; reason?: string }
  | { type: "module-retried"; projectId: string; moduleId: ModuleId };

/** Assinatura de um observador registrado via `PipelineEngine.subscribe`. */
export type PipelineEngineListener = (event: PipelineEngineEvent) => void;
