import { NextRequest, NextResponse } from "next/server";
import { sceneAssetUseCases } from "@/lib/scene-assets/container";
import { SceneAssetAlreadyLinkedError } from "@/lib/scene-assets/errors";
import { errorResponse, internalErrorResponse } from "../_lib/respond";
import { isSceneAssetRole } from "../_lib/validation";

/**
 * PATCH /api/scene-assets/:sceneAssetId — atualiza o papel de um vínculo.
 * Corpo esperado: `{ role }`.
 *
 * HTTP -> UpdateSceneAssetRoleUseCase -> SceneAssetService -> SceneAssetRepository
 */
export async function PATCH(request: NextRequest, { params }: { params: { sceneAssetId: string } }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Corpo da requisição inválido ou ausente.");
  }

  const { role } = body as Record<string, unknown>;
  if (!isSceneAssetRole(role)) {
    return errorResponse(400, "INVALID_ROLE", 'Campo "role" é obrigatório e deve ser um SceneAssetRole válido.');
  }

  try {
    const updated = await sceneAssetUseCases.updateSceneAssetRole.execute({
      sceneAssetId: params.sceneAssetId,
      role,
    });
    if (!updated) {
      return errorResponse(404, "SCENE_ASSET_NOT_FOUND", `Nenhum vínculo encontrado com id "${params.sceneAssetId}".`);
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof SceneAssetAlreadyLinkedError) {
      return errorResponse(409, "ALREADY_LINKED", error.message);
    }
    return internalErrorResponse("PATCH /api/scene-assets/:sceneAssetId", error);
  }
}

/**
 * DELETE /api/scene-assets/:sceneAssetId — remove um vínculo (o Asset em si não é afetado).
 *
 * HTTP -> DetachAssetFromSceneUseCase -> SceneAssetService -> SceneAssetRepository
 */
export async function DELETE(_request: NextRequest, { params }: { params: { sceneAssetId: string } }) {
  try {
    const detached = await sceneAssetUseCases.detachAssetFromScene.execute({ sceneAssetId: params.sceneAssetId });
    if (!detached) {
      return errorResponse(404, "SCENE_ASSET_NOT_FOUND", `Nenhum vínculo encontrado com id "${params.sceneAssetId}".`);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalErrorResponse("DELETE /api/scene-assets/:sceneAssetId", error);
  }
}
