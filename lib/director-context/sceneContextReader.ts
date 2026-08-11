import { DirectorContext } from "./types";

/**
 * Porta de leitura do Director Context (Task "Director Engine
 * Foundation"). Mesmo princípio de `SceneAssetRepository`
 * (`lib/scene-assets/repository.ts`): um contrato puro — quem consome
 * (um futuro Director Engine) depende só desta interface, nunca de uma
 * implementação concreta.
 *
 * Não conhece Prisma, HTTP, Next.js, React ou qualquer infraestrutura —
 * só produz `DirectorContext`, o formato puro definido em `./types`.
 */
export interface SceneContextReader {
  /**
   * Monta o `DirectorContext` de uma cena a partir do estado atual do
   * Scene Asset Binding (e, quando resolvível, da identidade da Scene).
   * Nunca lança para um `sceneId` sem Scene correspondente — `scene`
   * fica só com `sceneId` preenchido, `creativeBrief` fica ausente e
   * `assets` continua populado (mesmo comportamento tolerante já usado
   * pelo resto do Scene Asset Binding, onde `sceneId` é uma string
   * opaca sem validação de existência).
   */
  getDirectorContext(sceneId: string): Promise<DirectorContext>;
}
