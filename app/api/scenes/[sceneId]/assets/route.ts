import { NextRequest, NextResponse } from "next/server";
import { sceneAssetUseCases } from "@/lib/scene-assets/container";
import { SceneAssetAlreadyLinkedError, SceneAssetTargetNotFoundError } from "@/lib/scene-assets/errors";
import { errorResponse, internalErrorResponse } from "../../_lib/respond";
import { isNonEmptyString, isPlainObject, isValidOrder, isValidRole } from "../../_lib/validation";

/**
 * POST /api/scenes/:sceneId/assets — vincula um Asset já existente à cena.
 * Corpo esperado: `{ assetId, role, order?, metadata? }`.
 *
 * HTTP -> AttachAssetToSceneUseCase -> SceneAssetService
 *      -> SceneAssetRepository (grava o vínculo) + AssetService (confirma que o Asset existe)
 *
 * `sceneId` vem do segmento de rota, não do corpo — mesma convenção de
 * `app/api/pipeline/[projectId]/*`.
 */
export async function POST(request: NextRequest, { params }: { params: { sceneId: string } }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Corpo da requisição inválido ou ausente.");
  }

  const { assetId, role, order, metadata } = body as Record<string, unknown>;

  if (!isNonEmptyString(assetId)) {
    return errorResponse(400, "ASSET_ID_REQUIRED", 'Campo "assetId" é obrigatório.');
  }
  if (!isValidRole(role)) {
    return errorResponse(400, "INVALID_ROLE", 'Campo "role" é obrigatório e deve ser uma string não vazia.');
  }
  if (order !== undefined && !isValidOrder(order)) {
    return errorResponse(400, "INVALID_ORDER", 'Campo "order", se informado, deve ser um inteiro >= 0.');
  }
  if (metadata !== undefined && metadata !== null && !isPlainObject(metadata)) {
    return errorResponse(400, "INVALID_METADATA", 'Campo "metadata", se informado, deve ser um objeto ou null.');
  }

  try {
    const sceneAsset = await sceneAssetUseCases.attachAssetToScene.execute({
      sceneId: params.sceneId,
      assetId,
      role,
      order,
      metadata: metadata as Record<string, unknown> | null | undefined,
    });
    return NextResponse.json(sceneAsset, { status: 201 });
  } catch (error) {
    if (error instanceof SceneAssetTargetNotFoundError) {
      return errorResponse(404, "ASSET_NOT_FOUND", error.message);
    }
    if (error instanceof SceneAssetAlreadyLinkedError) {
      return errorResponse(409, "ALREADY_LINKED", error.message);
    }
    return internalErrorResponse("POST /api/scenes/:sceneId/assets", error);
  }
}

/**
 * GET /api/scenes/:sceneId/assets — lista os Assets vinculados à cena, em ordem.
 *
 * HTTP -> ListSceneAssetsUseCase -> SceneAssetService -> SceneAssetRepository + AssetService
 */
export async function GET(_request: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const sceneAssets = await sceneAssetUseCases.listSceneAssets.execute({ sceneId: params.sceneId });
    return NextResponse.json(sceneAssets);
  } catch (error) {
    return internalErrorResponse("GET /api/scenes/:sceneId/assets", error);
  }
}
