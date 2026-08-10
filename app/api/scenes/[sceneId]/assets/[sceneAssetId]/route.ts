import { NextRequest, NextResponse } from "next/server";
import { sceneAssetUseCases } from "@/lib/scene-assets/container";
import { SceneAssetAlreadyLinkedError } from "@/lib/scene-assets/errors";
import { errorResponse, internalErrorResponse } from "../../../_lib/respond";
import { isPlainObject, isValidOrder, isValidRole } from "../../../_lib/validation";

/**
 * Segmento final é `:sceneAssetId` (o id do VÍNCULO), não `:assetId`.
 *
 * Um mesmo Asset pode estar vinculado à mesma cena mais de uma vez, com
 * papéis diferentes — `@@unique([sceneId, assetId, role])` no schema
 * permite isso de propósito (ex.: uma foto que é ao mesmo tempo
 * REFERENCE_IMAGE e CONCEPT_ART da cena). Endereçar por `:assetId`
 * seria ambíguo nesse caso; `:sceneAssetId` identifica exatamente um
 * vínculo, sempre.
 */

/**
 * PATCH /api/scenes/:sceneId/assets/:sceneAssetId — atualiza um vínculo (parcial).
 * Corpo esperado: `{ role?, order?, metadata? }` — pelo menos um campo.
 *
 * HTTP -> UpdateSceneAssetUseCase -> SceneAssetService -> SceneAssetRepository
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sceneId: string; sceneAssetId: string } }
) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Corpo da requisição inválido ou ausente.");
  }

  const { role, order, metadata } = body as Record<string, unknown>;

  if (role === undefined && order === undefined && metadata === undefined) {
    return errorResponse(400, "NO_FIELDS_TO_UPDATE", 'Informe ao menos um campo: "role", "order" ou "metadata".');
  }
  if (role !== undefined && !isValidRole(role)) {
    return errorResponse(400, "INVALID_ROLE", 'Campo "role", se informado, deve ser uma string não vazia.');
  }
  if (order !== undefined && !isValidOrder(order)) {
    return errorResponse(400, "INVALID_ORDER", 'Campo "order", se informado, deve ser um inteiro >= 0.');
  }
  if (metadata !== undefined && metadata !== null && !isPlainObject(metadata)) {
    return errorResponse(400, "INVALID_METADATA", 'Campo "metadata", se informado, deve ser um objeto ou null.');
  }

  try {
    const updated = await sceneAssetUseCases.updateSceneAsset.execute({
      sceneAssetId: params.sceneAssetId,
      role: role as string | undefined,
      order: order as number | undefined,
      metadata: metadata as Record<string, unknown> | null | undefined,
    });
    if (!updated) {
      return errorResponse(404, "SCENE_ASSET_NOT_FOUND", `Nenhum vínculo encontrado com id "${params.sceneAssetId}".`);
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof SceneAssetAlreadyLinkedError) {
      return errorResponse(409, "ALREADY_LINKED", error.message);
    }
    return internalErrorResponse("PATCH /api/scenes/:sceneId/assets/:sceneAssetId", error);
  }
}

/**
 * DELETE /api/scenes/:sceneId/assets/:sceneAssetId — remove SOMENTE o
 * vínculo. O Asset referenciado nunca é apagado nem alterado por esta
 * rota — ele continua pertencendo ao Asset Manager, disponível na
 * Biblioteca, disponível para ser vinculado a outra cena depois.
 *
 * HTTP -> DetachAssetFromSceneUseCase -> SceneAssetService -> SceneAssetRepository
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sceneId: string; sceneAssetId: string } }
) {
  try {
    const detached = await sceneAssetUseCases.detachAssetFromScene.execute({ sceneAssetId: params.sceneAssetId });
    if (!detached) {
      return errorResponse(404, "SCENE_ASSET_NOT_FOUND", `Nenhum vínculo encontrado com id "${params.sceneAssetId}".`);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalErrorResponse("DELETE /api/scenes/:sceneId/assets/:sceneAssetId", error);
  }
}
