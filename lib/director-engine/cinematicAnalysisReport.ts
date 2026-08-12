import { CinematicDecision, CinematicDecisionCategory, CinematicDecisionStatus } from "./cinematicDecision";

/**
 * Cinematic Analysis Report (Task "Director Engine — Relatório
 * Cinematográfico Determinístico por Cena"). Primeiro comportamento
 * real do `DirectorEngine`: transformar uma `CinematicDecision` num
 * relatório estrutural explicável — nunca "decidir como filmar".
 *
 * Substitui `CinematicAssessment` (Task "Director Engine — Deterministic
 * Cinematic Assessment", nunca commitada). Este relatório é um
 * superconjunto estrito do que `CinematicAssessment` produzia (mesma
 * classificação AVAILABLE/UNAVAILABLE, mesma contagem, mesmo
 * agrupamento por categoria) mais o detalhamento por categoria
 * (`categories`, com `value`/`source`/`requirement`) e `missingFields`
 * pedidos nesta Task — por isso `cinematicAssessment.ts` foi removido
 * em vez de mantido ao lado deste (regra do próprio brief: "não crie
 * duplicação de tipos se já existir um contrato reutilizável"; regra
 * geral do projeto: "não duplicar dados sem necessidade"). Manter os
 * dois lado a lado deixaria `CinematicAssessment` como código morto,
 * sem nenhum consumidor.
 *
 * DADO -> INTENÇÃO -> DECISÃO -> RELATÓRIO ESTRUTURAL. Ainda não é
 * DECISÃO CINEMATOGRÁFICA REAL: nenhuma lente, distância focal,
 * abertura, ISO, obturador, posição/movimento de câmera, intensidade de
 * luz, temperatura de cor, BPM, duração estruturada, score de emoção,
 * tipo de plano, estilo visual, prompt de geração, ranking ou confiança
 * aparece aqui. O relatório só informa o que já está em
 * `CinematicDecision`, reorganizado — nunca interpreta `value`.
 */

/**
 * `DEFINED`: a categoria tem `value`/`source` (veio de `CinematicIntent`
 * de verdade). `MISSING`: a categoria não tem evidência — precisa de
 * dado antes de qualquer decisão cinematográfica futura. Mapeamento 1:1
 * com `CinematicDecisionStatus` (`AVAILABLE`/`UNAVAILABLE`), só com
 * nomes voltados para "o que falta definir" em vez de "o que existe".
 */
export type CinematicAnalysisRequirement = "DEFINED" | "MISSING";

/**
 * Uma entrada por categoria — eco de `CinematicDecisionEntry` (mesmo
 * `category`/`status`/`value`/`source`, sem transformação) mais
 * `requirement`, derivado mecanicamente de `status`.
 */
export interface CinematicAnalysisCategoryEntry {
  category: CinematicDecisionCategory;
  status: CinematicDecisionStatus;
  value?: string | readonly string[];
  source?: string;
  requirement: CinematicAnalysisRequirement;
}

/**
 * `totalCategories` é sempre `decision.decisions.length` — nunca um
 * número fixo hardcoded (hoje sempre 8, mas o cálculo não assume isso;
 * se `CinematicDecision` ganhar uma 9ª categoria no futuro, este
 * relatório funciona sem alteração).
 */
export interface CinematicAnalysisSummary {
  availableCategories: CinematicDecisionCategory[];
  unavailableCategories: CinematicDecisionCategory[];
  totalCategories: number;
  availableCount: number;
  unavailableCount: number;
}

/**
 * O contrato principal — puro, serializável (`JSON.stringify` sempre
 * seguro), determinístico (mesma `CinematicDecision` sempre produz o
 * mesmo `CinematicAnalysisReport` — nenhum campo temporal aqui; "quando
 * foi gerado" já é `DirectorEngineResult.generatedAt`).
 */
export interface CinematicAnalysisReport {
  /** Ecoa `decision.sceneId`. */
  sceneId: string;
  summary: CinematicAnalysisSummary;
  /** Uma entrada por categoria recebida, na mesma ordem de `decision.decisions`. */
  categories: CinematicAnalysisCategoryEntry[];
  /**
   * Categorias com `requirement: "MISSING"` — mesmos valores de
   * `summary.unavailableCategories` (mesmo array, referenciado duas
   * vezes; não há cálculo duplicado), só sob um nome pensado para quem
   * consome "o que falta definir" diretamente, sem precisar ler `summary`.
   */
  missingFields: CinematicDecisionCategory[];
}

/**
 * Constrói um `CinematicAnalysisReport` a partir de um `CinematicDecision`
 * já pronto. Pura e determinística: mesma entrada sempre produz a
 * mesma saída (nenhum `Date.now()`, `Math.random()`, UUID). Nunca
 * modifica `decision`.
 *
 * Transformação puramente mecânica: para cada entrada, `category`/
 * `status`/`value`/`source` são copiados exatamente como vieram, e
 * `requirement` é derivado só de `status` (`AVAILABLE` -> `DEFINED`,
 * `UNAVAILABLE` -> `MISSING`) — nunca do conteúdo de `value`. Uma
 * `category` fora das conhecidas (só possível com um `CinematicDecision`
 * construído à mão, fora de `createCinematicDecision`) não é descartada
 * nem corrigida: aparece em `categories`/`summary`/`missingFields`
 * exatamente como as demais, classificada só pelo `status`.
 *
 * Não pertence a nenhuma outra camada (`Repository`/`SceneContextReader`/
 * Use Case/`container.ts`) — função livre, sem estado, sem dependência
 * injetada.
 */
export function createCinematicAnalysisReport(decision: CinematicDecision): CinematicAnalysisReport {
  const categories: CinematicAnalysisCategoryEntry[] = decision.decisions.map((entry) => ({
    category: entry.category,
    status: entry.status,
    value: entry.value,
    source: entry.source,
    requirement: entry.status === "AVAILABLE" ? "DEFINED" : "MISSING",
  }));

  const availableCategories = categories.filter((c) => c.status === "AVAILABLE").map((c) => c.category);
  const unavailableCategories = categories.filter((c) => c.status === "UNAVAILABLE").map((c) => c.category);

  const summary: CinematicAnalysisSummary = {
    availableCategories,
    unavailableCategories,
    totalCategories: decision.decisions.length,
    availableCount: availableCategories.length,
    unavailableCount: unavailableCategories.length,
  };

  return {
    sceneId: decision.sceneId,
    summary,
    categories,
    missingFields: unavailableCategories,
  };
}
