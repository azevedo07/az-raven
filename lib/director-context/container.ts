import "server-only";
import { scenes } from "../data";
import { sceneAssetService } from "../scene-assets/container";
import { SceneContextReaderImpl } from "./sceneContextReaderImpl";

/**
 * Composition Root do Director Context (Task "Director Engine
 * Foundation") — mesmo padrão de `lib/assets/container.ts` e
 * `lib/scene-assets/container.ts`: cada módulo compõe as próprias
 * dependências uma única vez, aqui.
 *
 * Consome `sceneAssetService`, já composto por `lib/scene-assets/container.ts`
 * (que por sua vez já consome `assetService` de `lib/assets/container.ts`)
 * — nenhuma lógica de negócio é reimplementada, nenhum Repository novo
 * é criado. `scenes` vem de `lib/data.ts`, a única fonte de identidade
 * de Scene que existe hoje (mock, sem tabela própria — mesma limitação
 * já documentada em `lib/scene-assets/types.ts`).
 *
 *   sceneAssetService (lib/scene-assets) -\
 *                                          +-> SceneContextReaderImpl
 *   scenes (lib/data.ts, mock)           -/
 */
export const sceneContextReader = new SceneContextReaderImpl(sceneAssetService, scenes);
