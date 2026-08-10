import { SceneAsset, SceneAssetRole } from "./types";

/**
 * Contrato de persistência do Asset Binding Engine (Sprint 2.0). Mesmo
 * princípio do `AssetRepository`/`PipelineRepository`: o Service depende
 * só desta interface, nunca de `PrismaSceneAssetRepository` diretamente.
 *
 * Só persistência — nenhuma regra de negócio. Em particular, este
 * Repository nunca consulta `Asset`/`AssetRepository`: "o Asset existe?"
 * é responsabilidade do `SceneAssetService` (que já tem o `AssetService`
 * injetado), não deste contrato.
 */

export interface AttachAssetInput {
  sceneId: string;
  assetId: string;
  role: SceneAssetRole;
  /** Posição do Asset na cena. Se omitida, o Repository anexa ao final (maior `order` já existente na cena + 1). */
  order?: number;
  metadata?: Record<string, unknown> | null;
}

/** Todos os campos são opcionais — só os presentes são alterados (mesmo princípio de `UpdateAssetInput` em `lib/assets/repository.ts`). */
export interface UpdateSceneAssetInput {
  role?: SceneAssetRole;
  order?: number;
  metadata?: Record<string, unknown> | null;
}

export interface SceneAssetRepository {
  /**
   * Cria o vínculo. Quando `input.order` não é informado, o Repository
   * calcula o próximo valor (anexa ao final da cena) — não é regra de
   * negócio, é só a semântica padrão de "novo vínculo entra no fim da
   * lista".
   * @throws {import("./errors").SceneAssetAlreadyLinkedError} se (sceneId, assetId, role) já existir.
   */
  attach(input: AttachAssetInput): Promise<SceneAsset>;

  /** Remove o vínculo. Idempotente — não lança se `id` não existir. */
  detach(id: string): Promise<void>;

  /** Busca um vínculo pelo id, ou `undefined` se não existir. */
  findById(id: string): Promise<SceneAsset | undefined>;

  /** Lista os vínculos de uma cena, ordenados por `order` (desempate por `createdAt`). */
  listBySceneId(sceneId: string): Promise<SceneAsset[]>;

  /**
   * Atualiza um vínculo existente (`role`/`order`/`metadata`, parcial); `undefined` se `id` não existir.
   * @throws {import("./errors").SceneAssetAlreadyLinkedError} se a mudança de papel colidir com outro vínculo já existente para o mesmo (sceneId, assetId).
   */
  update(id: string, input: UpdateSceneAssetInput): Promise<SceneAsset | undefined>;
}
