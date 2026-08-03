import { SceneAssetDomainEvent, SceneAssetDomainEventListener, SceneAssetRole, SceneAssetWithDetails, toSceneAssetSummary } from "./types";
import { AttachAssetInput, SceneAssetRepository } from "./repository";
import { SceneAssetTargetNotFoundError } from "./errors";
import { AssetService } from "../assets/assetService";

/**
 * Scene Asset Service — camada de orquestração do Asset Binding Engine
 * (Sprint 2.0). Depende de duas interfaces/serviços injetados via
 * construtor, nunca instanciados aqui: `SceneAssetRepository` (o
 * vínculo) e `AssetService` (para saber se o Asset referenciado existe
 * de verdade e para enriquecer a listagem com nome/tipo/status/tamanho).
 *
 * Consumir `AssetService` — não `AssetRepository`/`PrismaAssetRepository`
 * nem `StorageAdapter` diretamente — é o mesmo princípio de inversão de
 * dependência já usado quando o próprio `AssetService` passou a
 * consumir `StorageAdapter` (Sprint 1.8, Task 2): um módulo consome o
 * **Service** público de outro, nunca sua infraestrutura interna.
 *
 * Não duplica Asset, não move arquivo, não cria Storage novo — só o
 * vínculo (`SceneAssetRepository`) e a leitura do que já existe
 * (`AssetService.getAsset`).
 */
export class SceneAssetService {
  private readonly listeners: SceneAssetDomainEventListener[] = [];

  constructor(
    private readonly repository: SceneAssetRepository,
    private readonly assetService: AssetService
  ) {}

  /**
   * Vincula um Asset já existente a uma cena. Valida que o Asset existe
   * (via `AssetService.getAsset`) antes de criar o vínculo — nenhuma
   * regra nova, só uma leitura de confirmação antes de uma escrita.
   *
   * @throws {SceneAssetTargetNotFoundError} se o Asset não existir.
   * @throws {SceneAssetAlreadyLinkedError} se (sceneId, assetId, role) já existir.
   */
  async attachAsset(input: AttachAssetInput): Promise<SceneAssetWithDetails> {
    const asset = await this.assetService.getAsset(input.assetId);
    if (!asset) {
      throw new SceneAssetTargetNotFoundError(input.assetId);
    }

    const sceneAsset = await this.repository.attach(input);
    this.emit({
      type: "ASSET_ATTACHED",
      sceneAssetId: sceneAsset.id,
      sceneId: sceneAsset.sceneId,
      assetId: sceneAsset.assetId,
      role: sceneAsset.role,
    });

    return { ...sceneAsset, asset: toSceneAssetSummary(asset) };
  }

  /**
   * Remove um vínculo e emite `ASSET_DETACHED` se ele existia. Devolve
   * `false` (em vez de lançar) para um `id` inexistente — quem chama
   * decide o que isso significa (ex.: a rota HTTP mapeia para 404).
   */
  async detachAsset(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return false;
    }
    await this.repository.detach(id);
    this.emit({
      type: "ASSET_DETACHED",
      sceneAssetId: existing.id,
      sceneId: existing.sceneId,
      assetId: existing.assetId,
    });
    return true;
  }

  /**
   * Lista os Assets vinculados a uma cena, cada um enriquecido com um
   * resumo do Asset (`SceneAssetSummary`). Um vínculo cujo Asset não seja
   * mais encontrável (não deveria acontecer, dada a FK) é silenciosamente
   * omitido — leitura pura, nenhum evento.
   */
  async listSceneAssets(sceneId: string): Promise<SceneAssetWithDetails[]> {
    const links = await this.repository.listBySceneId(sceneId);
    const enriched: SceneAssetWithDetails[] = [];

    for (const link of links) {
      const asset = await this.assetService.getAsset(link.assetId);
      if (asset) {
        enriched.push({ ...link, asset: toSceneAssetSummary(asset) });
      }
    }

    return enriched;
  }

  /** Atualiza o papel de um vínculo existente e emite `ASSET_ROLE_UPDATED`. `undefined` se não existir. */
  async updateRole(id: string, role: SceneAssetRole): Promise<SceneAssetWithDetails | undefined> {
    const updated = await this.repository.updateRole(id, role);
    if (!updated) {
      return undefined;
    }

    this.emit({ type: "ASSET_ROLE_UPDATED", sceneAssetId: updated.id, sceneId: updated.sceneId, assetId: updated.assetId, role });

    const asset = await this.assetService.getAsset(updated.assetId);
    return asset ? { ...updated, asset: toSceneAssetSummary(asset) } : undefined;
  }

  /** Registra um observador de eventos de domínio. Mesmo padrão de `AssetService.subscribe`/`PipelineEngine.subscribe`. */
  subscribe(listener: SceneAssetDomainEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emit(event: SceneAssetDomainEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
