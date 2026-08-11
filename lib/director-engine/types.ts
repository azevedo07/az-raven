import { DirectorContext } from "../director-context/types";

/**
 * Director Engine — contratos (Task "Director Engine Foundation, parte
 * 2"). Esta Task cria SOMENTE a fronteira arquitetural: `DirectorEngine`
 * aceita um `DirectorContext` já pronto e devolve um resultado mínimo,
 * determinístico, sem nenhuma decisão cinematográfica.
 *
 * Direção de dependência permitida (e única):
 *
 *   director-engine -> DirectorContext (lib/director-context/types.ts)
 *
 * Nunca o inverso. Este arquivo não importa `Scene`, nenhum Repository,
 * nenhum Service, Prisma, Storage, Next.js ou React — só o contrato
 * puro de `lib/director-context/types.ts`.
 *
 * `DirectorEngineResult` é deliberadamente mínimo — nenhum campo
 * cinematográfico (câmera, iluminação, ritmo, emoção derivada) foi
 * adicionado. Quando uma decisão real de direção existir num Director
 * Engine futuro, ela pertence a uma Task futura, não a esta.
 */

/**
 * `PROCESSED`: o `DirectorContext` tinha a estrutura mínima exigida e
 * foi aceito. `INVALID_CONTEXT`: o `DirectorContext` (ou algo dentro
 * dele) não tinha a estrutura mínima — ver `diagnostics` para o motivo.
 * Nenhum dos dois estados representa uma decisão cinematográfica; é só
 * validação estrutural.
 */
export type DirectorEngineStatus = "PROCESSED" | "INVALID_CONTEXT";

/** Uma constatação estrutural sobre o `DirectorContext` recebido — nunca sobre o conteúdo criativo dele. */
export interface DirectorEngineDiagnostic {
  code: string;
  message: string;
}

/**
 * O resultado de `DirectorEngine.process` — puro, serializável
 * (`JSON.stringify` sempre seguro), sem nenhuma dependência de
 * infraestrutura. Mesmo princípio de `DirectorContext`: nenhuma classe,
 * nenhum `Date`, nenhum objeto de infraestrutura.
 */
export interface DirectorEngineResult {
  status: DirectorEngineStatus;
  /** Ecoa `context.scene.sceneId` — string vazia só quando o próprio `context`/`context.scene` está ausente (ver `diagnostics` nesse caso). */
  sceneId: string;
  /** ISO 8601 — hora em que este resultado foi produzido (não é `generatedAt` do `DirectorContext` de entrada). */
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
   * Aceita um `DirectorContext` já pronto (produzido por
   * `SceneContextReader.getDirectorContext`, em outra camada — este
   * método nunca busca ou constrói o contexto sozinho) e devolve um
   * `DirectorEngineResult`. Não modifica `context`. Não lança para um
   * `DirectorContext` estruturalmente inválido — devolve
   * `status: "INVALID_CONTEXT"` com o(s) motivo(s) em `diagnostics`,
   * nunca uma exceção (mesmo tratamento explícito, testável por valor
   * de retorno, não por `try/catch`).
   */
  process(context: DirectorContext): Promise<DirectorEngineResult>;
}
