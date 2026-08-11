/**
 * Director Context — contrato puro de leitura (Task "Director Engine
 * Foundation"). Fronteira entre o modelo atual de Scene/Scene Asset
 * Binding e o futuro Director Engine (ainda não implementado nesta
 * Task, nem em nenhuma Task futura ainda). Mesmo princípio já usado em
 * `lib/pipeline-core/types.ts`/`lib/assets/types.ts`/`lib/scene-assets/types.ts`:
 * este arquivo não importa Prisma, Next.js, React, HTTP, Storage ou
 * qualquer infraestrutura concreta — só tipos e literais, seguro para
 * `JSON.stringify` e para rodar em qualquer runtime (inclusive um futuro
 * processo de IA fora do Next.js).
 *
 * IMPORTANTE — o que é real hoje vs. o que é futuro:
 *
 * `DirectorSceneIdentity` reflete exatamente os campos que já existem em
 * `Scene` (`lib/types.ts`) e que fazem sentido para o Director: `n`
 * (ordem), `title`, `status`, `duracao`. `projectId` é opcional porque
 * `Scene` HOJE não tem esse campo (o Storyboard é uma lista plana em
 * `lib/data.ts`, sem relação com `Project`) — nenhuma implementação
 * atual consegue preenchê-lo; existe no contrato para quando isso mudar.
 *
 * `DirectorSceneCreativeBrief` é uma descoberta da inspeção, não um
 * pedido literal desta Task: `Scene` já possui `emo` (objetivo
 * emocional) e `narr` (objetivo narrativo) — a Task havia listado esses
 * dois como "dados futuros hipotéticos", mas eles já existem, junto com
 * `luz`/`cam`/`som`/`paleta`/`criterio`. Como já são reais, são
 * representados aqui como texto livre já autoral (não como sinais
 * estruturados/derivados) — nada disso é inventado, é a transcrição
 * direta dos campos que já existem em `lib/data.ts`. Consumo é opcional;
 * nenhum código hoje depende deles.
 *
 * `DirectorContextAsset` espelha `SceneAssetWithDetails`
 * (`lib/scene-assets/types.ts`) achatado para o formato que o Director
 * precisa — mesmos campos, sem adicionar nem remover informação.
 *
 * NADA aqui representa: intenção de câmera, iluminação como parâmetro
 * estruturado, estado emocional de personagem, continuidade, ritmo,
 * restrições cinematográficas ou qualquer outro dado listado como
 * "futuro" no brief desta Task — esses não existem no sistema hoje e
 * não foram inventados.
 */

/** Identidade estrutural da Scene — só campos que já existem em `Scene` (`lib/types.ts`) hoje. */
export interface DirectorSceneIdentity {
  /** Mesma string usada em `SceneAsset.sceneId` — hoje, `String(Scene.n)`. */
  sceneId: string;
  /**
   * `Scene` não possui este campo hoje (sem tabela/relação `Project`
   * para o Storyboard) — sempre `undefined` na implementação atual.
   * Mantido no contrato para quando uma Scene real e persistida existir.
   */
  projectId?: string;
  /** `Scene.title`. */
  title?: string;
  /** `Scene.n` — posição da cena no Storyboard (1-based, como already exibido na UI). */
  order?: number;
  /** `Scene.status` — hoje um dos 3 valores livres já usados no Storyboard ("aprovado" | "em revisão" | "pendente"). */
  status?: string;
  /** `Scene.duracao` — texto livre já autoral (ex.: "45s"), não um número de segundos estruturado. */
  duration?: string;
}

/**
 * Texto criativo livre já existente em `Scene` — não são sinais
 * derivados/estruturados, são exatamente os campos que já existem no
 * Storyboard hoje (`lib/data.ts`). Ver nota no topo do arquivo.
 */
export interface DirectorSceneCreativeBrief {
  /** `Scene.emo`. */
  emotionalGoal?: string;
  /** `Scene.narr`. */
  narrativeGoal?: string;
  /** `Scene.luz` — descrição textual livre, não um parâmetro estruturado de iluminação. */
  lighting?: string;
  /** `Scene.cam` — descrição textual livre, não uma intenção de câmera estruturada. */
  camera?: string;
  /** `Scene.som`. */
  sound?: string;
  /** `Scene.paleta`. */
  palette?: readonly string[];
  /** `Scene.criterio` — critério de aprovação da cena, já autoral. */
  approvalCriteria?: string;
}

/**
 * Um Asset vinculado à Scene, no formato que o Director poderá
 * consumir — espelha `SceneAssetWithDetails` (`lib/scene-assets/types.ts`)
 * achatado; nenhum campo novo, nenhum campo removido.
 */
export interface DirectorContextAsset {
  /** Id do vínculo (`SceneAsset.id`) — não o id do Asset. */
  sceneAssetId: string;
  assetId: string;
  name: string;
  type: string;
  mimeType: string;
  extension: string;
  /** Bytes — já convertido de BigInt para `number` na fronteira do Asset Manager (ver `lib/assets/types.ts`). */
  size: number;
  status: string;
  storageProvider: string | null;
  role: string;
  /** Posição do Asset dentro da cena (0-based) — mesmo valor de `SceneAsset.order`. */
  order: number;
  metadata: Record<string, unknown> | null;
  /** `SceneAsset.createdAt`, convertido para ISO 8601 na fronteira do reader (`Date` não é seguro para `JSON.stringify` de forma implícita/estável). */
  linkedAt: string;
  /** `SceneAsset.updatedAt`, convertido para ISO 8601. */
  updatedAt: string;
}

/**
 * O contrato principal — o objeto que o futuro Director Engine
 * consumirá. Puro, serializável (`JSON.stringify(context)` sempre
 * seguro), sem nenhuma dependência de infraestrutura.
 */
export interface DirectorContext {
  scene: DirectorSceneIdentity;
  /** Ausente quando a Scene não foi encontrada na fonte de identidade atual (`lib/data.ts`) — `assets` continua populado mesmo assim, já que `SceneAsset.sceneId` não depende de uma Scene resolvível (ver `lib/scene-assets/types.ts`). */
  creativeBrief?: DirectorSceneCreativeBrief;
  /** Na mesma ordem que `SceneAssetService.listSceneAssets` já devolve (por `order`, desempate por criação). */
  assets: DirectorContextAsset[];
  /** ISO 8601 — quando este snapshot foi construído (não é `updatedAt` de nenhuma entidade; é a hora da leitura). */
  generatedAt: string;
}
