import { SceneContextReader } from "../../director-context/sceneContextReader";
import { createCinematicDecision } from "../cinematicDecision";
import { createCinematicIntent } from "../cinematicIntent";
import { DirectorEngine, DirectorEngineResult } from "../types";

/**
 * Use Case de orquestração (Task "Director Engine — Orquestração";
 * `createCinematicIntent` integrado na Task "Director Engine —
 * Integrar CinematicIntent ao processamento"; `createCinematicDecision`
 * integrado na Task "Director Engine — Primeira Camada de Decisão
 * Cinematográfica Determinística"). Prova a sequência:
 *
 *   sceneId -> SceneContextReader -> DirectorContext -> createCinematicIntent -> CinematicIntent -> createCinematicDecision -> CinematicDecision -> DirectorEngine.process() -> DirectorEngineResult
 *
 * Nenhuma regra de negócio própria — só repassa a chamada e aplica as
 * duas transformações puras (`createCinematicIntent`,
 * `createCinematicDecision`) no meio do caminho, exatamente como todo
 * Use Case já existente no projeto (`lib/assets/use-cases/`,
 * `lib/scene-assets/use-cases/`). Depende só de `SceneContextReader` e
 * `DirectorEngine` — as duas portas puras, nunca das implementações
 * concretas (`SceneContextReaderImpl`/`DirectorEngineImpl`), nunca de
 * `SceneAssetService`/`AssetService`/Prisma/Storage diretamente. Nem
 * `createCinematicIntent` nem `createCinematicDecision` são injetadas —
 * são funções puras sem estado, importadas diretamente (mesmo princípio
 * de qualquer função utilitária pura no projeto: só classes/serviços
 * com uma implementação a trocar entram via injeção de dependência).
 * Quem decide QUAL implementação de `SceneContextReader`/`DirectorEngine`
 * injetar é `lib/director-engine/container.ts` — este arquivo não
 * instancia nada.
 */

export interface ProcessSceneWithDirectorInput {
  sceneId: string;
}

/** Executa a Cena através do Director Engine e devolve o `DirectorEngineResult` — nenhum tipo novo, reaproveita o contrato já existente. */
export interface ProcessSceneWithDirectorUseCase {
  execute(input: ProcessSceneWithDirectorInput): Promise<DirectorEngineResult>;
}

/**
 * Implementação concreta. Depende só das duas portas (injetadas via
 * construtor) — nunca instancia `SceneContextReaderImpl`/
 * `DirectorEngineImpl` diretamente, nunca chama outro Use Case.
 */
export class ProcessSceneWithDirectorUseCaseImpl implements ProcessSceneWithDirectorUseCase {
  constructor(
    private readonly contextReader: SceneContextReader,
    private readonly directorEngine: DirectorEngine
  ) {}

  async execute({ sceneId }: ProcessSceneWithDirectorInput): Promise<DirectorEngineResult> {
    const context = await this.contextReader.getDirectorContext(sceneId);
    const intent = createCinematicIntent(context);
    const decision = createCinematicDecision(intent);
    return this.directorEngine.process(decision);
  }
}
