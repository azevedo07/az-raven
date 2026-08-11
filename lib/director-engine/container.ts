import "server-only";
import { sceneContextReader } from "../director-context/container";
import { DirectorEngineImpl } from "./directorEngine";
import { ProcessSceneWithDirectorUseCaseImpl } from "./use-cases/processSceneWithDirectorUseCase";

/**
 * Composition Root do Director Engine (Task "Director Engine
 * Foundation, parte 2"; Use Case de orquestração adicionado na Task
 * "Director Engine — Orquestração") — mesmo padrão de
 * `lib/assets/container.ts`, `lib/scene-assets/container.ts` e
 * `lib/director-context/container.ts`: único lugar do projeto que
 * instancia `DirectorEngineImpl` e `ProcessSceneWithDirectorUseCaseImpl`.
 *
 * `import "server-only"` é defensivo, não estritamente exigido pelo
 * código de hoje (`DirectorEngineImpl` não toca Prisma/Storage/Node
 * APIs) — mas o Director Engine só faz sentido rodando no servidor
 * (processamento pesado, futura chamada a IA), então a guarda evita que
 * um import futuro acidentalmente vaze este módulo para o bundle do
 * navegador.
 *
 * `directorEngine` não recebe nenhuma dependência composta de outro
 * módulo — `DirectorEngineImpl` não depende de nada além do contrato
 * `DirectorContext`. `processSceneWithDirectorUseCase` consome
 * `sceneContextReader`, já composto por `lib/director-context/container.ts`
 * (que por sua vez já consome `sceneAssetService`) — nenhuma lógica de
 * negócio é reimplementada, nenhum Repository/Service novo é criado.
 *
 *   sceneContextReader (lib/director-context) -\
 *                                                +-> ProcessSceneWithDirectorUseCaseImpl
 *   directorEngine (este arquivo)              -/
 */
export const directorEngine = new DirectorEngineImpl();

export const processSceneWithDirectorUseCase = new ProcessSceneWithDirectorUseCaseImpl(
  sceneContextReader,
  directorEngine
);
