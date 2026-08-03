import { NextRequest, NextResponse } from "next/server";
import { sceneAssetUseCases } from "@/lib/scene-assets/container";
import { SceneAssetAlreadyLinkedError, SceneAssetTargetNotFoundError } from "@/lib/scene-assets/errors";
import { errorResponse, internalErrorResponse } from "./_lib/respond";
import { isNonEmptyString, isSceneAssetRole } from "./_lib/validation";

/**
 * POST /api/scene-assets — vincula um Asset já existente a uma cena.
 * Corpo esperado: `{ sceneId, assetId, role }`.
 *
 * HTTP -> AttachAssetToSceneUseCase -> SceneAssetService
 *      -> SceneAssetRepository (grava o vínculo) + AssetService (confirma que o Asset existe)
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Corpo da requisição inválido ou ausente.");
  }

  const { sceneId, assetId, role } = body as Record<string, unknown>;

  if (!isNonEmptyString(sceneId)) {
    return errorResponse(400, "SCENE_ID_REQUIRED", 'Campo "sceneId" é obrigatório.');
  }
  if (!isNonEmptyString(assetId)) {
    return errorResponse(400, "ASSET_ID_REQUIRED", 'Campo "assetId" é obrigatório.');
  }
  if (!isSceneAssetRole(role)) {
    return errorResponse(400, "INVALID_ROLE", 'Campo "role" é obrigatório e deve ser um SceneAssetRole válido.');
  }

  try {
    const sceneAsset = await sceneAssetUseCases.attachAssetToScene.execute({ sceneId, assetId, role });
    return NextResponse.json(sceneAsset, { status: 201 });
  } catch (error) {
    if (error instanceof SceneAssetTargetNotFoundError) {
      return errorResponse(404, "ASSET_NOT_FOUND", error.message);
    }
    if (error instanceof SceneAssetAlreadyLinkedError) {
      return errorResponse(409, "ALREADY_LINKED", error.message);
    }
    return internalErrorResponse("POST /api/scene-assets", error);
  }
}

/**
 * GET /api/scene-assets?sceneId=... — lista os Assets vinculados a uma cena.
 *
 * HTTP -> ListSceneAssetsUseCase -> SceneAssetService -> SceneAssetRepository + AssetService
 */
export async function GET(request: NextRequest) {
  const sceneId = request.nextUrl.searchParams.get("sceneId");
  if (!isNonEmptyString(sceneId)) {
    return errorResponse(400, "SCENE_ID_REQUIRED", 'Parâmetro de query "sceneId" é obrigatório.');
  }

  try {
    const sceneAssets = await sceneAssetUseCases.listSceneAssets.execute({ sceneId });
    return NextResponse.json(sceneAssets);
  } catch (error) {
    return internalErrorResponse("GET /api/scene-assets", error);
  }
}
