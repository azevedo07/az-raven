/**
 * Barrel do módulo Director Context (Task "Director Engine Foundation").
 * Exporta só a superfície pública: o contrato (`./types`) e a porta
 * (`./sceneContextReader`) — não reexporta `SceneContextReaderImpl` nem
 * `container.ts` daqui. Um futuro consumidor (Director Engine, ou
 * qualquer código server-side) deve importar a implementação composta
 * diretamente de `lib/director-context/container.ts`, nunca instanciar
 * `SceneContextReaderImpl` fora dali — mesmo princípio já aplicado em
 * todo o resto do projeto (`lib/assets/container.ts`,
 * `lib/scene-assets/container.ts`).
 */
export * from "./types";
export * from "./sceneContextReader";
