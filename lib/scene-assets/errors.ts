/**
 * Asset Binding Engine — erros de domínio (Sprint 2.0). Mesmo padrão de
 * `lib/storage/storageErrors.ts`: uma base + subclasses específicas,
 * `extends Error`, `name` próprio.
 */

export class SceneAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneAssetError";
  }
}

/** O Asset referenciado não existe (ou está com status "DELETED") — não há o que vincular. */
export class SceneAssetTargetNotFoundError extends SceneAssetError {
  constructor(assetId: string) {
    super(`Asset "${assetId}" não existe — não é possível vincular.`);
    this.name = "SceneAssetTargetNotFoundError";
  }
}

/** Esta combinação (cena, asset, papel) já está vinculada — `@@unique([sceneId, assetId, role])` no schema. */
export class SceneAssetAlreadyLinkedError extends SceneAssetError {
  constructor(
    public readonly sceneId: string,
    public readonly assetId: string,
    public readonly role: string
  ) {
    super(`O Asset "${assetId}" já está vinculado à cena "${sceneId}" com o papel "${role}".`);
    this.name = "SceneAssetAlreadyLinkedError";
  }
}
