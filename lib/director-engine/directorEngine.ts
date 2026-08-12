import { CinematicDecision } from "./cinematicDecision";
import { createCinematicAnalysisReport } from "./cinematicAnalysisReport";
import { DirectorEngine, DirectorEngineDiagnostic, DirectorEngineResult } from "./types";

/**
 * Implementação mínima do `DirectorEngine` (Task "Director Engine
 * Foundation, parte 2"; migrada de `DirectorContext` para
 * `CinematicIntent` na Task "Director Engine — Integrar CinematicIntent
 * ao processamento"; migrada de `CinematicIntent` para
 * `CinematicDecision` na Task "Director Engine — Primeira Camada de
 * Decisão Cinematográfica Determinística"; passa a produzir
 * `CinematicAnalysisReport` na Task "Director Engine — Relatório
 * Cinematográfico Determinístico por Cena"). Continua deliberadamente
 * burra: não pensa como diretor, não pontua qualidade, não decide
 * câmera/iluminação/ritmo, não chama nenhuma IA. "Agir" sobre a
 * decisão, nesta Task, significa só CLASSIFICAR/CONTAR/AGRUPAR/EXPLICAR
 * o que já está em `CinematicDecision` — nunca interpretar o conteúdo
 * (`value`) de nenhuma categoria. Valida a estrutura mínima, preserva
 * `sceneId`, ecoa a decisão E o relatório de análise derivado dela no
 * resultado, devolve um resultado serializável, nunca modifica a
 * entrada.
 *
 * Decisão cinematográfica real (câmera, iluminação, ritmo, etc.) é
 * responsabilidade de uma Task futura — não desta classe.
 */
export class DirectorEngineImpl implements DirectorEngine {
  async process(decision: CinematicDecision): Promise<DirectorEngineResult> {
    const diagnostics = this.validate(decision);

    if (diagnostics.length > 0) {
      return {
        status: "INVALID_CONTEXT",
        sceneId: decision?.sceneId ?? "",
        generatedAt: new Date().toISOString(),
        diagnostics,
      };
    }

    return {
      status: "PROCESSED",
      sceneId: decision.sceneId,
      decision,
      analysisReport: createCinematicAnalysisReport(decision),
      generatedAt: new Date().toISOString(),
      diagnostics: [],
    };
  }

  /**
   * Só validação estrutural (o `CinematicDecision` tem a forma mínima
   * exigida?) — nunca validação de conteúdo criativo (não julga se as
   * decisões em si fazem sentido, só se `decision` em si é um objeto
   * com `sceneId` e um array de `decisions`). `decision` é tipado como
   * `CinematicDecision`, mas é tratado defensivamente como possivelmente
   * `null`/incompleto, já que quem chama pode não estar em TypeScript
   * (ex.: um futuro processo externo).
   */
  private validate(decision: CinematicDecision): DirectorEngineDiagnostic[] {
    const diagnostics: DirectorEngineDiagnostic[] = [];

    if (!decision) {
      diagnostics.push({ code: "MISSING_DECISION", message: "CinematicDecision não foi informado." });
      return diagnostics;
    }
    if (typeof decision.sceneId !== "string" || decision.sceneId.trim() === "") {
      diagnostics.push({ code: "MISSING_SCENE_ID", message: "CinematicDecision.sceneId é obrigatório e deve ser uma string não vazia." });
    }
    if (!Array.isArray(decision.decisions)) {
      diagnostics.push({ code: "INVALID_DECISIONS", message: "CinematicDecision.decisions deve ser um array." });
    }

    return diagnostics;
  }
}
