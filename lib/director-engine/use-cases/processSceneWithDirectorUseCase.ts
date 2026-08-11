import { SceneContextReader } from "../../director-context/sceneContextReader";
import { DirectorEngine, DirectorEngineResult } from "../types";

/**
 * Use Case de orquestração (Task "Director Engine — Orquestração").
 * Prova a sequência:
 *
 *   sceneId -> SceneContextReader -> DirectorContext -> DirectorEngine.process() -> DirectorEngineResult
 *
 * Nenhuma regra de negócio própria — só repassa a chamada, exatamente
 * como todo Use Case já existente no projeto (`lib/assets/use-cases/`,
 * `lib/scene-assets/use-cases/`). Depende só de `SceneContextReader` e
 * `DirectorEngine` — as duas portas puras, nunca das implementações
 * concretas (`SceneContextReaderImpl`/`DirectorEngineImpl`), nunca de
 * `SceneAssetService`/`AssetService`/Prisma/Storage diretamente. Quem
 * decide QUAL implementação injetar é `lib/director-engine/container.ts`
 * — este arquivo não instancia nada.
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
    return this.directorEngine.process(context);
  }
}
