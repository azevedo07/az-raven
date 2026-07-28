import { getModuleDefinition, moduleRegistry, validateRegistry } from "./registry";
import {
  ExecutionStatus,
  ModuleExecutionState,
  ModuleId,
  PipelineEngineEvent,
  PipelineEngineListener,
  PipelineState,
  PipelineSummary,
  ProjectPipelineStatus,
  TransitionCheck,
} from "./types";

/**
 * Erro lançado quando uma ação do `PipelineEngine` (start/finish/fail/
 * retry/pause/resume/cancel) é chamada em um estado que não permite essa
 * transição. Ações sempre validam via `validateTransition` antes de
 * mutar o estado — este erro nunca deixa o estado interno inconsistente.
 */
export class PipelineTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineTransitionError";
  }
}

/**
 * Motor de execução do pipeline de produção de um único projeto.
 *
 * Mantém em memória o estado de execução dos 12 módulos definidos no
 * registry (Task 2) e o status geral do projeto, aplicando as regras de
 * dependência e transição descritas na Seção 5 do
 * `docs/MASTER_SPECIFICATION.md`. Não conhece React, rotas HTTP ou
 * persistência em disco/banco — isso é responsabilidade da camada de
 * estado (Task 4), que deve instanciar e envolver este motor.
 *
 * Emite um `PipelineEngineEvent` após cada transição bem-sucedida via
 * `subscribe`, para que camadas futuras (persistência, API, notificações)
 * possam reagir a mudanças de estado sem acoplar sua lógica aqui dentro.
 *
 * **Nota arquitetural — Sprint 1.3 (Persistência do Pipeline Engine):**
 * este engine ainda não tem `save()`, `load()`, `serialize()` nem
 * `deserialize()` — essa API fica para a Sprint 1.3 e não deve ser
 * implementada antes disso. O que existe hoje é a preparação para que
 * essa API possa ser adicionada sem quebrar compatibilidade:
 * - `getState()` + `getProjectStatus()` já expõem tudo que uma futura
 *   `serialize()` precisa — dados simples (strings/números/records),
 *   sem classes nem funções, prontos para `JSON.stringify`.
 * - O construtor aceita um segundo parâmetro opcional `restore` e
 *   `fromPersistedState` é o ponto de entrada nomeado para reidratar um
 *   engine a partir de estado persistido — a contraparte que uma futura
 *   `load()`/`deserialize()` vai chamar. `new PipelineEngine(projectId)`
 *   sem o segundo parâmetro continua criando um engine novo em "idle",
 *   exatamente como antes.
 */
export class PipelineEngine {
  private readonly state: PipelineState;
  private projectStatus: ProjectPipelineStatus;
  private readonly listeners = new Set<PipelineEngineListener>();

  /**
   * @param projectId Identificador do projeto dono deste pipeline.
   * @param restore Estado previamente persistido para reidratar o engine
   *   em vez de começar do zero. Uso interno — prefira
   *   `PipelineEngine.fromPersistedState` para reidratar a partir de
   *   estado salvo; omitir este parâmetro sempre cria um engine novo.
   */
  constructor(
    projectId: string,
    restore?: { modules: Record<ModuleId, ModuleExecutionState>; projectStatus: ProjectPipelineStatus }
  ) {
    validateRegistry();

    if (restore) {
      const missingModuleId = moduleRegistry.find((module) => !restore.modules[module.id]);
      if (missingModuleId) {
        throw new PipelineTransitionError(
          `Estado restaurado está incompleto: falta o módulo "${missingModuleId.id}".`
        );
      }
      this.projectStatus = restore.projectStatus;
      this.state = { projectId, modules: { ...restore.modules } };
      return;
    }

    this.projectStatus = "idle";
    this.state = {
      projectId,
      modules: Object.fromEntries(
        moduleRegistry.map((module) => [
          module.id,
          {
            moduleId: module.id,
            status: "pending",
            pct: 0,
            eta: "",
            description: "",
          } as ModuleExecutionState,
        ])
      ) as Record<ModuleId, ModuleExecutionState>,
    };
  }

  /**
   * Reidrata um engine a partir de estado previamente persistido —
   * o ponto de entrada nomeado que a Sprint 1.3 vai chamar a partir de
   * `load()`/`deserialize()`. Não faz nenhuma leitura de disco/banco por
   * conta própria: recebe o estado já carregado por quem chama.
   */
  static fromPersistedState(state: PipelineState, projectStatus: ProjectPipelineStatus): PipelineEngine {
    return new PipelineEngine(state.projectId, { modules: state.modules, projectStatus });
  }

  /** Retorna uma cópia do estado atual do pipeline (não expõe a referência interna). */
  getState(): PipelineState {
    return { projectId: this.state.projectId, modules: { ...this.state.modules } };
  }

  /** Status atual do projeto no pipeline (não confundir com o status de um módulo). */
  getProjectStatus(): ProjectPipelineStatus {
    return this.projectStatus;
  }

  /**
   * Registra um observador para os eventos emitidos por este engine.
   *
   * @returns função de cancelamento — chame-a para remover o observador.
   */
  subscribe(listener: PipelineEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Inicia o projeto: move o status do projeto de "idle" para "running"
   * e inicia automaticamente o primeiro módulo do pipeline (o único sem
   * dependências, `literary-director`).
   *
   * @throws {PipelineTransitionError} se o projeto já tiver sido iniciado antes.
   */
  startProject(): void {
    if (this.projectStatus !== "idle") {
      throw new PipelineTransitionError(
        `Projeto "${this.state.projectId}" já foi iniciado (status atual: "${this.projectStatus}").`
      );
    }
    this.projectStatus = "running";
    this.emit({ type: "project-started", projectId: this.state.projectId });
    this.startModule(moduleRegistry[0].id);
  }

  /**
   * Inicia um módulo específico, movendo-o de "pending" para "active".
   *
   * @throws {PipelineTransitionError} se `validateTransition` rejeitar a transição.
   */
  startModule(moduleId: ModuleId): void {
    this.assertValid(moduleId, "active");
    this.patchModule(moduleId, { status: "active" });
    this.emit({ type: "module-started", projectId: this.state.projectId, moduleId });
  }

  /**
   * Marca um módulo como concluído, movendo-o de "active" para "done".
   * Quando o módulo concluído é o último do pipeline (`export`), o
   * projeto inteiro passa a "completed".
   *
   * @throws {PipelineTransitionError} se o módulo não estiver "active".
   */
  finishModule(moduleId: ModuleId): void {
    this.assertValid(moduleId, "done");
    this.patchModule(moduleId, { status: "done", pct: 100 });
    this.emit({ type: "module-finished", projectId: this.state.projectId, moduleId });

    const lastModuleId = moduleRegistry[moduleRegistry.length - 1].id;
    if (moduleId === lastModuleId) {
      this.projectStatus = "completed";
      this.emit({ type: "project-completed", projectId: this.state.projectId });
    }
  }

  /**
   * Marca um módulo como falho, movendo-o de "active" para "error".
   *
   * @throws {PipelineTransitionError} se o módulo não estiver "active".
   */
  failModule(moduleId: ModuleId, reason?: string): void {
    this.assertValid(moduleId, "error");
    this.patchModule(moduleId, { status: "error", description: reason ?? this.state.modules[moduleId].description });
    this.emit({ type: "module-failed", projectId: this.state.projectId, moduleId, reason });
  }

  /**
   * Reseta um módulo que falhou de volta para "pending", para que possa
   * ser iniciado novamente com `startModule`. Não reinicia a execução
   * sozinho — `retryModule` prepara o módulo, `startModule` o executa.
   *
   * @throws {PipelineTransitionError} se o módulo não estiver "error".
   */
  retryModule(moduleId: ModuleId): void {
    this.assertValid(moduleId, "pending");
    this.patchModule(moduleId, { status: "pending", pct: 0 });
    this.emit({ type: "module-retried", projectId: this.state.projectId, moduleId });
  }

  /**
   * Pausa o projeto: nenhum novo módulo pode ser iniciado enquanto
   * pausado. Um módulo já "active" no momento da pausa não é
   * interrompido por esta chamada.
   *
   * @throws {PipelineTransitionError} se o projeto não estiver "running".
   */
  pauseProject(): void {
    if (this.projectStatus !== "running") {
      throw new PipelineTransitionError(
        `Só é possível pausar um projeto em execução (status atual: "${this.projectStatus}").`
      );
    }
    this.projectStatus = "paused";
    this.emit({ type: "project-paused", projectId: this.state.projectId });
  }

  /**
   * Retoma um projeto pausado, voltando o status para "running".
   *
   * @throws {PipelineTransitionError} se o projeto não estiver "paused".
   */
  resumeProject(): void {
    if (this.projectStatus !== "paused") {
      throw new PipelineTransitionError(
        `Só é possível retomar um projeto pausado (status atual: "${this.projectStatus}").`
      );
    }
    this.projectStatus = "running";
    this.emit({ type: "project-resumed", projectId: this.state.projectId });
  }

  /**
   * Cancela o projeto definitivamente. Estado terminal — não pode ser
   * retomado depois.
   *
   * @throws {PipelineTransitionError} se o projeto já estiver em um estado terminal ("cancelled" ou "completed").
   */
  cancelProject(): void {
    if (this.projectStatus === "cancelled" || this.projectStatus === "completed") {
      throw new PipelineTransitionError(
        `Projeto "${this.state.projectId}" já está em estado terminal ("${this.projectStatus}") e não pode ser cancelado.`
      );
    }
    this.projectStatus = "cancelled";
    this.emit({ type: "project-cancelled", projectId: this.state.projectId });
  }

  /**
   * Progresso agregado do pipeline: percentual geral (média do `pct` de
   * todos os módulos, arredondado) e contagem de módulos concluídos.
   */
  getProgress(): PipelineSummary {
    const modules = Object.values(this.state.modules);
    const doneCount = modules.filter((module) => module.status === "done").length;
    const overallProgress = Math.round(
      modules.reduce((sum, module) => sum + module.pct, 0) / modules.length
    );
    return { projectId: this.state.projectId, overallProgress, doneCount, totalCount: modules.length };
  }

  /**
   * Lista, na ordem canônica do registry, os módulos que podem ser
   * iniciados agora: status "pending" com todas as dependências em
   * "done". Retorna lista vazia se o projeto não estiver "running".
   */
  getAvailableModules(): ModuleId[] {
    if (this.projectStatus !== "running") {
      return [];
    }
    return moduleRegistry
      .filter((module) => this.dependenciesMet(module.id) && this.state.modules[module.id].status === "pending")
      .map((module) => module.id);
  }

  /**
   * Verifica, sem efeito colateral, se um módulo pode transitar para o
   * status alvo dado o estado atual do módulo, suas dependências e o
   * status do projeto. Todas as ações mutáveis desta classe chamam este
   * método internamente antes de aplicar qualquer mudança.
   */
  validateTransition(moduleId: ModuleId, targetStatus: ExecutionStatus): TransitionCheck {
    const definition = getModuleDefinition(moduleId);
    const current = this.state.modules[moduleId];

    if (targetStatus === "active") {
      if (this.projectStatus !== "running") {
        return { valid: false, reason: `Projeto não está em execução (status: "${this.projectStatus}").` };
      }
      if (current.status !== "pending") {
        return {
          valid: false,
          reason: `Módulo "${moduleId}" só pode iniciar a partir de "pending" (status atual: "${current.status}").`,
        };
      }
      const unmetDependency = definition.dependsOn.find(
        (dependencyId) => this.state.modules[dependencyId].status !== "done"
      );
      if (unmetDependency) {
        return {
          valid: false,
          reason: `Módulo "${moduleId}" não pode iniciar: dependência "${unmetDependency}" ainda não foi concluída.`,
        };
      }
      return { valid: true };
    }

    if (targetStatus === "done" || targetStatus === "error") {
      if (current.status !== "active") {
        return {
          valid: false,
          reason: `Módulo "${moduleId}" só pode ir para "${targetStatus}" a partir de "active" (status atual: "${current.status}").`,
        };
      }
      return { valid: true };
    }

    if (targetStatus === "pending") {
      if (current.status !== "error") {
        return {
          valid: false,
          reason: `Módulo "${moduleId}" só pode ser reiniciado a partir de "error" (status atual: "${current.status}").`,
        };
      }
      return { valid: true };
    }

    return { valid: false, reason: `Transição para "${targetStatus}" não é reconhecida pelo Pipeline Core.` };
  }

  private dependenciesMet(moduleId: ModuleId): boolean {
    const definition = getModuleDefinition(moduleId);
    return definition.dependsOn.every((dependencyId) => this.state.modules[dependencyId].status === "done");
  }

  private assertValid(moduleId: ModuleId, targetStatus: ExecutionStatus): void {
    const check = this.validateTransition(moduleId, targetStatus);
    if (!check.valid) {
      throw new PipelineTransitionError(check.reason ?? `Transição inválida para o módulo "${moduleId}".`);
    }
  }

  private patchModule(moduleId: ModuleId, patch: Partial<ModuleExecutionState>): void {
    this.state.modules[moduleId] = { ...this.state.modules[moduleId], ...patch };
  }

  /**
   * Notifica os observadores registrados. Um listener que lança erro não
   * interrompe os demais nem desfaz a transição de estado, que já foi
   * aplicada antes deste ponto.
   */
  private emit(event: PipelineEngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[PipelineEngine] listener falhou ao processar evento "${event.type}":`, error);
      }
    }
  }
}
