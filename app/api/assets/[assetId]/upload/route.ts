import { NextRequest, NextResponse } from "next/server";
import { assetUseCases } from "@/lib/assets/container";
import { errorResponse, internalErrorResponse } from "../../_lib/respond";

/**
 * POST /api/assets/:assetId/upload — Upload do arquivo
 * Corpo esperado: `multipart/form-data` com um campo `file`.
 *
 * HTTP -> UploadAssetUseCase -> AssetService -> StorageAdapter -> AssetRepository
 *
 * Nunca instancia nem chama `LocalStorageAdapter` diretamente — só o
 * `UploadAssetUseCase` (que por sua vez só conhece a interface
 * `StorageAdapter`, injetada no `AssetService` pelo Composition Root).
 */
export async function POST(request: NextRequest, { params }: { params: { assetId: string } }) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "INVALID_MULTIPART", "Corpo multipart/form-data inválido ou ausente.");
  }

  const file = formData.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return errorResponse(400, "FILE_REQUIRED", 'Campo "file" é obrigatório e deve ser um arquivo.');
  }

  const asset = await assetUseCases.getAsset.execute({ assetId: params.assetId });
  if (!asset) {
    return errorResponse(404, "ASSET_NOT_FOUND", `Nenhum Asset encontrado com id "${params.assetId}".`);
  }
  if (asset.status === "DELETED") {
    return errorResponse(409, "ASSET_DELETED", "Não é possível enviar um arquivo para um Asset removido.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return errorResponse(400, "EMPTY_FILE", "O arquivo enviado está vazio.");
  }

  try {
    const updated = await assetUseCases.uploadAsset.execute({
      assetId: params.assetId,
      data: buffer,
      contentType: file.type || undefined,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return internalErrorResponse("POST /api/assets/:assetId/upload", error);
  }
}
