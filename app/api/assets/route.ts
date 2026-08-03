import { NextRequest, NextResponse } from "next/server";
import { assetUseCases } from "@/lib/assets/container";
import { errorResponse, internalErrorResponse } from "./_lib/respond";
import { isAssetType, isNonEmptyString } from "./_lib/validation";

/**
 * POST /api/assets — Criar Asset
 * Corpo esperado: `{ projectId, type, name, originalName, mimeType, extension, size }`.
 *
 * HTTP -> CreateAssetUseCase -> AssetService -> AssetRepository -> PrismaAssetRepository
 *
 * Só o registro é criado aqui (status inicial "PENDING") — nenhum
 * arquivo é enviado nesta rota (ver POST /api/assets/:assetId/upload).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Corpo da requisição inválido ou ausente.");
  }

  const { projectId, type, name, originalName, mimeType, extension, size } = body as Record<string, unknown>;

  if (!isNonEmptyString(projectId)) {
    return errorResponse(400, "PROJECT_ID_REQUIRED", 'Campo "projectId" é obrigatório.');
  }
  if (!isAssetType(type)) {
    return errorResponse(400, "INVALID_TYPE", 'Campo "type" é obrigatório e deve ser um AssetType válido.');
  }
  if (!isNonEmptyString(name) || !isNonEmptyString(originalName)) {
    return errorResponse(400, "NAME_REQUIRED", 'Campos "name" e "originalName" são obrigatórios.');
  }
  if (!isNonEmptyString(mimeType) || !isNonEmptyString(extension)) {
    return errorResponse(400, "FILE_METADATA_REQUIRED", 'Campos "mimeType" e "extension" são obrigatórios.');
  }
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
    return errorResponse(400, "INVALID_SIZE", 'Campo "size" é obrigatório e deve ser um número >= 0.');
  }

  try {
    const asset = await assetUseCases.createAsset.execute({
      projectId,
      type,
      name,
      originalName,
      mimeType,
      extension,
      size,
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return internalErrorResponse("POST /api/assets", error);
  }
}

/**
 * GET /api/assets?projectId=... — Listar Assets
 *
 * HTTP -> ListAssetsUseCase -> AssetService -> AssetRepository -> PrismaAssetRepository
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!isNonEmptyString(projectId)) {
    return errorResponse(400, "PROJECT_ID_REQUIRED", 'Parâmetro de query "projectId" é obrigatório.');
  }

  try {
    const assets = await assetUseCases.listAssets.execute({ projectId });
    return NextResponse.json(assets);
  } catch (error) {
    return internalErrorResponse("GET /api/assets", error);
  }
}
