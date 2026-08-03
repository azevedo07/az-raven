import { PipelineEngineEvent, PipelineState, ProjectPipelineStatus } from "../pipeline-core/types";

/**
 * Contratos do Repository Pattern da camada de persistência (Sprint 1.3).
 *
 * Este arquivo não importa `@prisma/client` nem qualquer código de
 * `lib/db/` — são interfaces puras. A implementação concreta (Prisma)
 * chega numa Task futura, em `lib/repositories/pipelineRepository.ts`.
 *
 * O Pipeline Service depende só destas interfaces, nunca de uma
 * implementação concreta diretamente — é isso que permite trocar Prisma
 * por outro ORM/mecanismo de persistência no futuro sem tocar em Service,
 * Engine, API ou UI.
 */

/**
 * Estado persistido de um pipeline: o par que `PipelineEngine.fromPersistedState`
 * espera para reidratar um engine a partir do banco.
 */
export interface PersistedPipelineState {
  state: PipelineState;
  projectStatus: ProjectPipelineStatus;
}

/**
 * Evento sintético gravado diretamente pelo `PipelineService` — não pelo
 * `PipelineEngine` — quando uma versão é restaurada (Sprint 1.5, Task 5).
 * `PipelineEngineEvent` (`lib/pipeline-core/types.ts`) é um union fechado
 * e esse arquivo está congelado desde a Sprint 1.1; restaurar uma versão
 * não é uma transição do Engine (não passa por `startModule`/`finishModule`/
 * etc., só rehidrata via `fromPersistedState`), então não existe — e não
 * deveria existir — uma variante `PipelineEngineEvent` pra isso. Este tipo
 * vive aqui, não em `pipeline-core/types.ts`, exatamente para não tocar no
 * arquivo congelado.
 */
export interface VersionRestoredEvent {
  type: "VERSION_RESTORED";
  projectId: string;
  versionId: string;
}

/**
 * Tudo que pode ser gravado como uma linha de `PipelineEvent`: os 9
 * eventos que o Engine emite, mais o evento sintético de restauração
 * acima. Um superconjunto estritamente aditivo de `PipelineEngineEvent` —
 * qualquer chamada que já funcionava com `PipelineEngineEvent` continua
 * funcionando igual.
 */
export type PipelineEventRecord = PipelineEngineEvent | VersionRestoredEvent;

/**
 * Uma entrada da linha do tempo de um pipeline: a tradução de uma linha
 * de `PipelineEvent` para um formato de leitura simples. `event` é o
 * `PipelineEventRecord` original, exatamente como foi emitido pelo
 * `PipelineEngine` (ou, no caso de `VERSION_RESTORED`, gravado pelo
 * Service) e persistido por `appendEvent` — nenhuma informação é perdida
 * ou reinterpretada aqui.
 */
export interface PipelineTimelineEntry {
  createdAt: Date;
  type: string;
  moduleId: string | null;
  event: PipelineEventRecord;
}

/**
 * Dados brutos persistidos de uma `PipelineExecution`, usados para montar
 * o Dashboard (Sprint 1.5, Task 3). Apenas os campos que o
 * `PipelineState`/`PipelineEngine` não carregam (são metadados de
 * persistência, não de domínio): quando a execução começou, quando foi
 * atualizada pela última vez, e quantos eventos já foram registrados.
 * Nenhum cálculo aqui — só consulta.
 */
export interface PipelineDashboardRawData {
  startedAt: Date;
  updatedAt: Date;
  eventCount: number;
}

/**
 * Resumo de uma versão (snapshot) do pipeline de um projeto — a forma de
 * listagem, sem o `snapshot` (payload completo do estado) que a tabela
 * `Version` carrega. Usado tanto por `createVersion` (o que acabou de ser
 * criado) quanto por `listVersions` (Sprint 1.5, Task 4). Visualizar o
 * conteúdo completo de uma versão específica é uma Task futura.
 */
export interface PipelineVersionSummary {
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * Uma versão com o snapshot completo (o que `Version.snapshot` guarda),
 * usada pela restauração (Sprint 1.5, Task 5) — diferente de
 * `PipelineVersionSummary` (só a listagem), inclui o
 * `PersistedPipelineState` exato que `PipelineEngine.fromPersistedState`
 * espera.
 */
export interface PipelineVersionDetail extends PipelineVersionSummary {
  snapshot: PersistedPipelineState;
}

/**
 * Contrato de persistência do pipeline de um projeto. Implementado por
 * `PrismaPipelineRepository` (Task futura); consumido exclusivamente
 * pelo Pipeline Service — nenhuma rota de API ou componente de UI deve
 * depender desta interface diretamente.
 */
export interface PipelineRepository {
  /**
   * Retorna o estado persistido do pipeline de um projeto, ou
   * `undefined` se o projeto nunca teve um pipeline inicializado.
   */
  findState(projectId: string): Promise<PersistedPipelineState | undefined>;

  /**
   * Persiste o estado atual do pipeline de um projeto — cria a execução
   * (e seus módulos) se ainda não existir, ou atualiza se já existir.
   */
  saveState(projectId: string, state: PipelineState, projectStatus: ProjectPipelineStatus): Promise<void>;

  /**
   * Registra um evento — emitido pelo `PipelineEngine` via `subscribe()`,
   * ou o evento sintético `VERSION_RESTORED` gravado pelo Service — como
   * um `PipelineEvent` — a trilha de auditoria/histórico específica do
   * pipeline, independente do `AuditLog` geral da plataforma.
   */
  appendEvent(projectId: string, event: PipelineEventRecord): Promise<void>;

  /**
   * Retorna a linha do tempo de eventos do pipeline de um projeto,
   * ordenada cronologicamente (mais antigo primeiro), ou `undefined` se
   * o projeto não tiver nenhuma execução de pipeline. Leitura pura — não
   * decide nada, só traduz as linhas de `PipelineEvent` já persistidas.
   */
  getTimeline(projectId: string): Promise<PipelineTimelineEntry[] | undefined>;

  /**
   * Retorna os dados brutos de persistência do pipeline de um projeto
   * (início, última atualização, quantidade de eventos), ou `undefined`
   * se o projeto não tiver nenhuma execução de pipeline. Leitura pura —
   * nenhuma agregação de módulos ou cálculo de progresso acontece aqui,
   * isso é responsabilidade do `PipelineService`.
   */
  getDashboard(projectId: string): Promise<PipelineDashboardRawData | undefined>;

  /**
   * Cria uma versão (snapshot) do pipeline de um projeto a partir do
   * estado atualmente persistido — reaproveita `findState()` para obter
   * esse estado, em vez de reconstruí-lo manualmente. Retorna `undefined`
   * se o projeto não tiver nenhuma execução de pipeline ainda.
   */
  createVersion(projectId: string, name: string): Promise<PipelineVersionSummary | undefined>;

  /**
   * Lista as versões (snapshots) já salvas do pipeline de um projeto,
   * mais recente primeiro, ou `undefined` se o projeto não tiver nenhuma
   * execução de pipeline. Leitura pura — nenhum payload de snapshot é
   * incluído aqui, só o resumo.
   */
  listVersions(projectId: string): Promise<PipelineVersionSummary[] | undefined>;

  /**
   * Retorna o snapshot completo de uma versão específica de um projeto
   * (id, name, createdAt e o `PersistedPipelineState` salvo), ou
   * `undefined` se a versão não existir ou não pertencer a esse projeto.
   * Leitura pura — restaurar não é responsabilidade do Repository, só
   * devolver o snapshot; a restauração em si fica no `PipelineService`.
   */
  getVersion(projectId: string, versionId: string): Promise<PipelineVersionDetail | undefined>;
}
