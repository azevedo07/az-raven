import { CinematicDecision } from "./cinematicDecision";
import { CinematicAnalysisReport } from "./cinematicAnalysisReport";

/**
 * Director Engine — contratos (Task "Director Engine Foundation, parte
 * 2"; `DirectorEngine.process` migrado de `DirectorContext` para
 * `CinematicIntent` na Task "Director Engine — Integrar CinematicIntent
 * ao processamento"; migrado de `CinematicIntent` para `CinematicDecision`
 * na Task "Director Engine — Primeira Camada de Decisão Cinematográfica
 * Determinística"; `analysisReport` adicionado na Task "Director Engine —
 * Relatório Cinematográfico Determinístico por Cena", a primeira vez
 * que o Engine produz algo além de um eco — mas ainda só classificação/
 * contagem/explicação estrutural, nenhuma decisão cinematográfica
 * real).
 *
 * Direção de dependência permitida (e única):
 *
 *   director-engine -> CinematicAnalysisReport (lib/director-engine/cinematicAnalysisReport.ts)
 *                    -> CinematicDecision (lib/director-engine/cinematicDecision.ts)
 *                    -> CinematicIntent (lib/director-engine/cinematicIntent.ts)
 *                    -> DirectorContext (lib/director-context/types.ts)
 *
 * Nunca o inverso. Este arquivo não importa `CinematicIntent` nem
 * `DirectorContext` diretamente — só `CinematicDecision` (parâmetro de
 * `process`, e ecoado em `DirectorEngineResult.decision`) e
 * `CinematicAnalysisReport` (o novo resultado derivado). Não importa
 * `Scene`, nenhum Repository, nenhum Service, Prisma, Storage, Next.js
 * ou React.
 *
 * `DirectorEngineResult` continua mínimo — `analysisReport` é só
 * classificação/contagem/explicação mecânica do `CinematicDecision`
 * recebido (nenhuma informação nova, nenhuma interpretação semântica),
 * nenhum campo cinematográfico real (câmera, iluminação, ritmo,
 * recomendação) foi inventado. Quando o Director Engine passar a tomar
 * decisões cinematográficas de verdade, isso pertence a uma Task
 * futura.
 */

/**
 * `PROCESSED`: o `CinematicDecision` tinha a estrutura mínima exigida e
 * foi aceito. `INVALID_CONTEXT`: o `CinematicDecision` (ou algo dentro
 * dele) não tinha a estrutura mínima — ver `diagnostics` para o motivo.
 * Nenhum dos dois estados representa uma decisão cinematográfica nova;
 * é só validação estrutural. (Nome mantido de Tasks anteriores por
 * compatibilidade — "context" aqui significa "o que foi processado",
 * não o tipo `DirectorContext` especificamente.)
 */
export type DirectorEngineStatus = "PROCESSED" | "INVALID_CONTEXT";

/** Uma constatação estrutural sobre o `CinematicDecision` recebido — nunca sobre o conteúdo criativo dele. */
export interface DirectorEngineDiagnostic {
  code: string;
  message: string;
}

/**
 * O resultado de `DirectorEngine.process` — puro, serializável
 * (`JSON.stringify` sempre seguro), sem nenhuma dependência de
 * infraestrutura. Mesmo princípio de `CinematicDecision`: nenhuma
 * classe, nenhum `Date`, nenhum objeto de infraestrutura.
 */
export interface DirectorEngineResult {
  status: DirectorEngineStatus;
  /** Ecoa `decision.sceneId` — string vazia só quando o próprio `decision` está ausente (ver `diagnostics` nesse caso). */
  sceneId: string;
  /** Eco do `CinematicDecision` recebido — ausente quando `status` é `"INVALID_CONTEXT"` (não há decisão válida para ecoar). Nenhuma transformação: exatamente o que `process` recebeu. */
  decision?: CinematicDecision;
  /** Relatório de análise estrutural derivado de `decision` (`createCinematicAnalysisReport`) — ausente quando `status` é `"INVALID_CONTEXT"`, pelo mesmo motivo de `decision`. */
  analysisReport?: CinematicAnalysisReport;
  /** ISO 8601 — hora em que este resultado foi produzido (não é nenhum `generatedAt` de uma camada anterior). */
  generatedAt: string;
  /** Vazio quando `status` é `"PROCESSED"`. */
  diagnostics: DirectorEngineDiagnostic[];
}

/**
 * Porta principal do Director Engine. Mesmo princípio de
 * `SceneContextReader` (`lib/director-context/sceneContextReader.ts`):
 * um contrato puro — quem compõe o módulo (`container.ts`) decide a
 * implementação; nenhum outro código deve depender da classe concreta.
 */
export interface DirectorEngine {
  /**
   * Aceita um `CinematicDecision` já pronto (produzido por
   * `createCinematicDecision`, a partir de um `CinematicIntent`, em
   * outra camada — este método nunca busca/constrói o contexto, o
   * intent ou a decisão sozinho) e devolve um `DirectorEngineResult`.
   * Não modifica `decision`. Não lança para um `CinematicDecision`
   * estruturalmente inválido — devolve `status: "INVALID_CONTEXT"` com
   * o(s) motivo(s) em `diagnostics`, nunca uma exceção (mesmo
   * tratamento explícito, testável por valor de retorno, não por
   * `try/catch`).
   */
  process(decision: CinematicDecision): Promise<DirectorEngineResult>;
}
