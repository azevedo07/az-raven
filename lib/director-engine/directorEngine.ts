import { DirectorContext } from "../director-context/types";
import { DirectorEngine, DirectorEngineDiagnostic, DirectorEngineResult } from "./types";

/**
 * Implementação mínima do `DirectorEngine` (Task "Director Engine
 * Foundation, parte 2"). Deliberadamente burra: não pensa como diretor,
 * não pontua nada, não decide câmera/iluminação/ritmo, não chama
 * nenhuma IA. Só prova que a fronteira `DirectorContext -> DirectorEngine`
 * funciona: aceita um contexto, valida a estrutura mínima, preserva
 * `sceneId`, devolve um resultado serializável, nunca modifica a
 * entrada.
 *
 * Comportamento futuro (decisão cinematográfica real) é responsabilidade
 * de uma Task futura — não desta classe.
 */
export class DirectorEngineImpl implements DirectorEngine {
  async process(context: DirectorContext): Promise<DirectorEngineResult> {
    const diagnostics = this.validate(context);

    if (diagnostics.length > 0) {
      return {
        status: "INVALID_CONTEXT",
        sceneId: context?.scene?.sceneId ?? "",
        generatedAt: new Date().toISOString(),
        diagnostics,
      };
    }

    return {
      status: "PROCESSED",
      sceneId: context.scene.sceneId,
      generatedAt: new Date().toISOString(),
      diagnostics: [],
    };
  }

  /**
   * Só validação estrutural (o `DirectorContext` tem a forma mínima
   * exigida?) — nunca validação de conteúdo criativo. `context` é
   * tipado como `DirectorContext`, mas é tratado defensivamente como
   * possivelmente `null`/incompleto, já que quem chama pode não estar
   * em TypeScript (ex.: um futuro processo externo).
   */
  private validate(context: DirectorContext): DirectorEngineDiagnostic[] {
    const diagnostics: DirectorEngineDiagnostic[] = [];

    if (!context) {
      diagnostics.push({ code: "MISSING_CONTEXT", message: "DirectorContext não foi informado." });
      return diagnostics;
    }
    if (!context.scene || typeof context.scene.sceneId !== "string" || context.scene.sceneId.trim() === "") {
      diagnostics.push({ code: "MISSING_SCENE_ID", message: 'DirectorContext.scene.sceneId é obrigatório e deve ser uma string não vazia.' });
    }
    if (!Array.isArray(context.assets)) {
      diagnostics.push({ code: "INVALID_ASSETS", message: "DirectorContext.assets deve ser um array." });
    }

    return diagnostics;
  }
}
