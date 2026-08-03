import "server-only";
import { PipelineEngine } from "../pipeline-core/engine";
import { ModuleId, PipelineEngineEvent, PipelineState, ProjectPipelineStatus } from "../pipeline-core/types";
import {
  PersistedPipelineState,
  PipelineRepository,
  PipelineTimelineEntry,
  PipelineVersionSummary,
} from "../repositories/types";

/**
 * Pipeline Service — camada de orquestração entre consumidores (Use
 * Cases da camada de Application, `store.ts`) e o Pipeline Engine. É a
 * única camada, além do próprio Engine, que importa
 * `lib/pipeline-core/engine.ts` diretamente:
 *
 *   UI → store.ts (Server Adapter) → Pipeline Service → Pipeline Engine → Registry
 *   HTTP → Use Case (lib/application/use-cases) → Pipeline Service → Pipeline Engine → Registry
 *                                                                  ↘ Pipeline Repository → Prisma → PostgreSQL
 *
 * A partir da Sprint 1.4 (Task 3), este arquivo não se auto-compõe mais
 * com `PrismaPipelineRepository` — a composição (`new PipelineService(new
 * PrismaPipelineRepository())`) vive num único lugar,
 * `lib/application/container.ts`, para não haver dois pontos de
 * montagem da mesma dependência.
 *
 * Decisão central da Sprint 1.3: o Service NÃO guarda mais um Map de
 * engines em memória entre chamadas. Cada operação reidrata o engine a
 * partir do que o `PipelineRepository` retornar (via
 * `PipelineEngine.fromPersistedState`), aplica a ação, e persiste o
 * resultado antes de retornar — isso é o que torna o processo
 * corretamente escalável horizontalmente (múltiplas instâncias, sem
 * estado divergente entre elas).
 *
 * O Repository é injetado via construtor (Dependency Injection) — o
 * Service depende só da interface `PipelineRepository`
 * (`lib/repositories/types.ts`), nunca de `PrismaPipelineRepository`
 * diretamente em sua lógica. Isso permite testar o Service com um
 * repositório falso em memória, sem precisar de um Postgres real.
 */

/**
 * Retrato agregado do pipeline de um projeto para o Dashboard de Execução
 * (Sprint 1.5, Task 3). Combina o estado de domínio (`PipelineState` via
 * Engine) com metadados de persistência (`PipelineDashboardRawData` via
 * Repository) — nenhum valor aqui é inventado, tudo deriva do que já
 * está persistido.
 *
 * `currentModule` é o único módulo com status "active" (a cadeia é
 * linear — no máximo um por vez). `nextModule` é o primeiro módulo
 * retornado por `getAvailableModules()` (mesma lógica já usada por
 * `RunNextModuleUseCase`, não reimplementada aqui).
 */
export interface PipelineDashboard {
  projectId: string;
  projectStatus: ProjectPipelineStatus;
  currentModule: ModuleId | null;
  progress: number;
  totalModules: number;
  completedModules: number;
  activeModules: number;
  failedModules: number;
  pendingModules: number;
  pausedModules: number;
  eventCount: number;
  startedAt: Date;
  updatedAt: Date;
  nextModule: ModuleId | null;
}

const O_CORVO_PROJECT_ID = "o-corvo";

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

function seedOCorvoEngine(): PipelineEngine {
  const engine = new PipelineEngine(O_CORVO_PROJECT_ID);
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

export class PipelineService {
  constructor(private readonly repository: PipelineRepository) {}

  /**
   * Retorna o estado atual do pipeline de um projeto, ou `undefined` se
   * o projeto não tiver um pipeline inicializado (e não for o projeto de
   * demonstração, que é seedado e persistido na primeira chamada).
   */
  async getPipelineState(projectId: string): Promise<PipelineState | undefined> {
    const engine = await this.loadOrSeedEngine(projectId);
    return engine?.getState();
  }

  /**
   * Inicia o pipeline de um projeto. Se já existir estado persistido, o
   * engine é reidratado a partir dele (e `startProject()` lança erro se
   * o projeto já tiver sido iniciado — comportamento do próprio Engine,
   * inalterado). Se não existir nenhum estado ainda, cria um engine novo
   * para o `projectId` informado — ao contrário de `getPipelineState`,
   * este método não depende do seed específico do projeto de
   * demonstração "o-corvo".
   */
  async startProject(projectId: string): Promise<PipelineState> {
    const persisted = await this.repository.findState(projectId);
    const engine = persisted
      ? PipelineEngine.fromPersistedState(persisted.state, persisted.projectStatus)
      : new PipelineEngine(projectId);

    return this.applyAndPersist(projectId, engine, (e) => e.startProject());
  }

  /** Inicia um módulo específico do pipeline de um projeto e persiste o resultado. */
  async startModule(projectId: string, moduleId: ModuleId): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.startModule(moduleId));
  }

  /** Marca um módulo como concluído e persiste o resultado. */
  async finishModule(projectId: string, moduleId: ModuleId): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.finishModule(moduleId));
  }

  /** Marca um módulo como falho e persiste o resultado. */
  async failModule(projectId: string, moduleId: ModuleId, reason?: string): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.failModule(moduleId, reason));
  }

  /** Reinicia um módulo que falhou (volta para "pending") e persiste o resultado. */
  async retryModule(projectId: string, moduleId: ModuleId): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.retryModule(moduleId));
  }

  /** Pausa o pipeline de um projeto e persiste o resultado. */
  async pauseProject(projectId: string): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.pauseProject());
  }

  /** Retoma o pipeline de um projeto pausado e persiste o resultado. */
  async resumeProject(projectId: string): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.resumeProject());
  }

  /** Cancela definitivamente o pipeline de um projeto e persiste o resultado. */
  async cancelProject(projectId: string): Promise<PipelineState> {
    return this.runAction(projectId, (engine) => engine.cancelProject());
  }

  /**
   * Retorna a linha do tempo de eventos do pipeline de um projeto,
   * ordenada cronologicamente, ou `undefined` se o projeto não tiver
   * pipeline inicializado. Leitura pura, direto do Repository — não
   * envolve o Engine (não há estado para reidratar aqui, só histórico).
   */
  async getTimeline(projectId: string): Promise<PipelineTimelineEntry[] | undefined> {
    return this.repository.getTimeline(projectId);
  }

  /**
   * Cria uma versão (snapshot) do pipeline de um projeto, ou `undefined`
   * se o projeto não tiver pipeline inicializado. Repassa direto ao
   * Repository — a serialização do estado usa o que já está persistido
   * (`findState`, dentro do Repository), não um estado recém-calculado
   * pelo Engine aqui.
   */
  async createVersion(projectId: string, name: string): Promise<PipelineVersionSummary | undefined> {
    return this.repository.createVersion(projectId, name);
  }

  /**
   * Lista as versões já salvas do pipeline de um projeto, mais recente
   * primeiro, ou `undefined` se o projeto não tiver pipeline
   * inicializado. Leitura pura, direto do Repository.
   */
  async listVersions(projectId: string): Promise<PipelineVersionSummary[] | undefined> {
    return this.repository.listVersions(projectId);
  }

  /**
   * Restaura o pipeline de um projeto para o snapshot de uma versão
   * salva, ou `undefined` se a versão não existir. Fluxo (Sprint 1.5,
   * Task 5): busca a versão; reconstrói o engine com
   * `PipelineEngine.fromPersistedState` (nunca reconstrói o estado à
   * mão); persiste esse estado de volta via `persist()` (o mesmo helper
   * privado usado por toda ação mutável — nenhuma lógica de persistência
   * duplicada); grava um evento `VERSION_RESTORED`; devolve o estado
   * atualizado.
   */
  async restoreVersion(projectId: string, versionId: string): Promise<PersistedPipelineState | undefined> {
    const version = await this.repository.getVersion(projectId, versionId);
    if (!version) {
      return undefined;
    }

    const engine = PipelineEngine.fromPersistedState(version.snapshot.state, version.snapshot.projectStatus);

    await this.persist(projectId, engine);
    await this.repository.appendEvent(projectId, { type: "VERSION_RESTORED", projectId, versionId });

    return { state: engine.getState(), projectStatus: engine.getProjectStatus() };
  }

  /**
   * Lista os módulos disponíveis para iniciar agora no pipeline de um
   * projeto (delegado a `PipelineEngine.getAvailableModules` — não
   * reimplementa a regra de dependência do registry aqui).
   */
  async getAvailableModules(projectId: string): Promise<ModuleId[]> {
    const engine = await this.loadOrSeedEngine(projectId);
    if (!engine) {
      throw new Error(`Projeto "${projectId}" não encontrado — nenhum pipeline inicializado.`);
    }
    return engine.getAvailableModules();
  }

  /**
   * Monta o retrato agregado do pipeline de um projeto para o Dashboard
   * de Execução, ou `undefined` se o projeto não tiver pipeline
   * inicializado. Só coordena: pega o progresso e a lista de módulos
   * disponíveis do Engine (`getProgress`, `getAvailableModules` — ambos
   * já existentes, nenhuma regra nova), os metadados de persistência do
   * Repository (`getDashboard`), e agrega as contagens por status a
   * partir do estado já carregado.
   */
  async getDashboard(projectId: string): Promise<PipelineDashboard | undefined> {
    const engine = await this.loadOrSeedEngine(projectId);
    if (!engine) {
      return undefined;
    }

    const raw = await this.repository.getDashboard(projectId);
    if (!raw) {
      return undefined;
    }

    const projectStatus = engine.getProjectStatus();
    const modules = Object.values(engine.getState().modules);
    const progress = engine.getProgress();

    const currentModule = modules.find((module) => module.status === "active")?.moduleId ?? null;
    const nextModule = engine.getAvailableModules()[0] ?? null;

    // Um módulo "active" no momento em que o projeto está pausado fica
    // congelado ali (ver PipelineEngine.pauseProject) — por isso é
    // reclassificado como "pausado" aqui, em vez de "ativo", para o
    // Dashboard não afirmar que algo está em andamento quando o projeto
    // inteiro está parado. Nenhum novo status é inventado: é a mesma
    // combinação (status do módulo + status do projeto) que já existe.
    const activeModules = modules.filter(
      (module) => module.status === "active" && projectStatus === "running"
    ).length;
    const pausedModules = modules.filter(
      (module) => module.status === "active" && projectStatus === "paused"
    ).length;

    return {
      projectId,
      projectStatus,
      currentModule,
      progress: progress.overallProgress,
      totalModules: progress.totalCount,
      completedModules: progress.doneCount,
      activeModules,
      failedModules: modules.filter((module) => module.status === "error").length,
      pendingModules: modules.filter((module) => module.status === "pending").length,
      pausedModules,
      eventCount: raw.eventCount,
      startedAt: raw.startedAt,
      updatedAt: raw.updatedAt,
      nextModule,
    };
  }

  /**
   * Reidrata o engine de um projeto a partir do estado persistido; se
   * não existir nenhum estado ainda e o projeto for o de demonstração,
   * cria e persiste o seed inicial. Retorna `undefined` para qualquer
   * outro projeto sem estado — nenhum dado inventado.
   */
  private async loadOrSeedEngine(projectId: string): Promise<PipelineEngine | undefined> {
    const persisted = await this.repository.findState(projectId);
    if (persisted) {
      return PipelineEngine.fromPersistedState(persisted.state, persisted.projectStatus);
    }

    if (projectId !== O_CORVO_PROJECT_ID) {
      return undefined;
    }

    const engine = seedOCorvoEngine();
    await this.persist(projectId, engine);
    return engine;
  }

  /**
   * Executa uma ação mutável sobre o engine de um projeto **já
   * existente**: carrega (ou seed inicial do projeto de demonstração),
   * falha se não encontrar nenhum, e delega a `applyAndPersist`.
   */
  private async runAction(projectId: string, action: (engine: PipelineEngine) => void): Promise<PipelineState> {
    const engine = await this.loadOrSeedEngine(projectId);
    if (!engine) {
      throw new Error(`Projeto "${projectId}" não encontrado — nenhum pipeline inicializado.`);
    }
    return this.applyAndPersist(projectId, engine, action);
  }

  /**
   * Aplica uma ação a um engine já resolvido (carregado ou recém-criado),
   * capturando os eventos emitidos, persistindo o novo estado e os
   * eventos, e retornando o estado resultante. Núcleo compartilhado por
   * `runAction` (ações sobre projeto existente) e `startProject` (que
   * resolve o engine de forma diferente — pode ser um projeto novo).
   */
  private async applyAndPersist(
    projectId: string,
    engine: PipelineEngine,
    action: (engine: PipelineEngine) => void
  ): Promise<PipelineState> {
    const events: PipelineEngineEvent[] = [];
    const unsubscribe = engine.subscribe((event) => events.push(event));
    try {
      action(engine);
    } finally {
      unsubscribe();
    }

    await this.persist(projectId, engine);
    for (const event of events) {
      await this.repository.appendEvent(projectId, event);
    }

    return engine.getState();
  }

  private async persist(projectId: string, engine: PipelineEngine): Promise<void> {
    await this.repository.saveState(projectId, engine.getState(), engine.getProjectStatus());
  }
}
