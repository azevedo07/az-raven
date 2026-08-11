import { Scene } from "../types";
import { SceneAssetService } from "../scene-assets/sceneAssetService";
import { DirectorContext, DirectorContextAsset, DirectorSceneCreativeBrief, DirectorSceneIdentity } from "./types";
import { SceneContextReader } from "./sceneContextReader";

/**
 * Implementação concreta de `SceneContextReader` (Task "Director Engine
 * Foundation"). Não duplica nenhuma regra de negócio: os Assets
 * vinculados vêm inteiramente de `SceneAssetService.listSceneAssets`
 * (já composto com `AssetService` — ver `lib/scene-assets/sceneAssetService.ts`),
 * e a identidade estrutural da Scene vem da única fonte que existe hoje
 * (`scenes`, de `lib/data.ts`) — nenhum Repository novo foi criado.
 *
 * `scenes` é recebido via construtor (não importado direto do módulo
 * aqui dentro) por dois motivos: (1) testabilidade — os testes deste
 * arquivo passam um array pequeno, sem precisar de Postgres nem do
 * `lib/data.ts` real; (2) honestidade arquitetural — quando `Scene` virar
 * uma entidade persistida de verdade, só `lib/director-context/container.ts`
 * precisa mudar (a linha que hoje passa `scenes` do mock), esta classe
 * não muda nada.
 */
export class SceneContextReaderImpl implements SceneContextReader {
  constructor(
    private readonly sceneAssetService: SceneAssetService,
    private readonly scenes: readonly Scene[]
  ) {}

  async getDirectorContext(sceneId: string): Promise<DirectorContext> {
    const scene = this.scenes.find((s) => String(s.n) === sceneId);
    const links = await this.sceneAssetService.listSceneAssets(sceneId);

    return {
      scene: this.toSceneIdentity(sceneId, scene),
      creativeBrief: scene ? this.toCreativeBrief(scene) : undefined,
      assets: links.map((link) => this.toContextAsset(link)),
      generatedAt: new Date().toISOString(),
    };
  }

  private toSceneIdentity(sceneId: string, scene: Scene | undefined): DirectorSceneIdentity {
    if (!scene) {
      return { sceneId };
    }
    return {
      sceneId,
      title: scene.title,
      order: scene.n,
      status: scene.status,
      duration: scene.duracao,
    };
  }

  private toCreativeBrief(scene: Scene): DirectorSceneCreativeBrief {
    return {
      emotionalGoal: scene.emo,
      narrativeGoal: scene.narr,
      lighting: scene.luz,
      camera: scene.cam,
      sound: scene.som,
      palette: scene.paleta,
      approvalCriteria: scene.criterio,
    };
  }

  private toContextAsset(link: Awaited<ReturnType<SceneAssetService["listSceneAssets"]>>[number]): DirectorContextAsset {
    return {
      sceneAssetId: link.id,
      assetId: link.assetId,
      name: link.asset.name,
      type: link.asset.type,
      mimeType: link.asset.mimeType,
      extension: link.asset.extension,
      size: link.asset.size,
      status: link.asset.status,
      storageProvider: link.asset.storageProvider,
      role: link.role,
      order: link.order,
      metadata: link.metadata,
      linkedAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    };
  }
}
