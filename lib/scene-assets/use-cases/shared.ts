/**
 * Camada de Application do Asset Binding Engine (Sprint 2.0) — casos de
 * uso. Mesmo princípio de `lib/assets/use-cases/shared.ts`: copiado
 * localmente, não importado de lá — `UseCase<Input, Output>` é uma forma
 * genérica trivial, não uma regra de negócio, e cada domínio permanece
 * independente.
 */

export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}

/** Entrada comum a casos de uso que operam sobre um vínculo específico. */
export interface SceneAssetIdInput {
  sceneAssetId: string;
}

/** Entrada comum a casos de uso que operam sobre todos os vínculos de uma cena. */
export interface SceneIdInput {
  sceneId: string;
}
