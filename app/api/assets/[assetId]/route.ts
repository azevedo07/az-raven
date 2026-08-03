import { NextRequest, NextResponse } from "next/server";
import { assetUseCases } from "@/lib/assets/container";
import { StorageFileNotFoundError } from "@/lib/storage/storageErrors";
import { errorResponse, internalErrorResponse } from "../_lib/respond";
import { isAssetStatus } from "../_lib/validation";

const ASSET_NOT_FOUND = (assetId: string) =>
  errorResponse(404, "ASSET_NOT_FOUND", `Nenhum Asset encontrado com id "${assetId}".`);

/**
 * GET /api/assets/:assetId — Obter Asset
 *
 * HTTP -> GetAssetUseCase -> AssetService -> AssetRepository -> PrismaAssetRepository
 */
export async function GET(_request: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const asset = await assetUseCases.getAsset.execute({ assetId: params.assetId });
    if (!asset) {
      return ASSET_NOT_FOUND(params.assetId);
    }
    return NextResponse.json(asset);
  } catch (error) {
    return internalErrorResponse("GET /api/assets/:assetId", error);
  }
}

/**
 * PATCH /api/assets/:assetId — Atualizar Asset
 * Corpo esperado (todos os campos opcionais): `{ name?, status?, hash?, storageKey?, storageProvider? }`.
 *
 * HTTP -> UpdateAssetUseCase -> AssetService -> AssetRepository -> PrismaAssetRepository
 */
export async function PATCH(request: NextRequest, { params }: { params: { assetId: string } }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Corpo da requisição inválido ou ausente.");
  }

  const { name, status, hash, storageKey, storageProvider } = body as Record<string, unknown>;

  if (status !== undefined && !isAssetStatus(status)) {
    return errorResponse(400, "INVALID_STATUS", 'Campo "status" deve ser um AssetStatus válido.');
  }
  if (name !== undefined && typeof name !== "string") {
    return errorResponse(400, "INVALID_NAME", 'Campo "name" deve ser uma string.');
  }
  if (hash !== undefined && hash !== null && typeof hash !== "string") {
    return errorResponse(400, "INVALID_HASH", 'Campo "hash" deve ser uma string ou null.');
  }
  if (storageKey !== undefined && storageKey !== null && typeof storageKey !== "string") {
    return errorResponse(400, "INVALID_STORAGE_KEY", 'Campo "storageKey" deve ser uma string ou null.');
  }
  if (storageProvider !== undefined && storageProvider !== null && typeof storageProvider !== "string") {
    return errorResponse(400, "INVALID_STORAGE_PROVIDER", 'Campo "storageProvider" deve ser uma string ou null.');
  }

  try {
    const updated = await assetUseCases.updateAsset.execute({
      assetId: params.assetId,
      data: { name, status, hash, storageKey, storageProvider },
    });
    if (!updated) {
      return ASSET_NOT_FOUND(params.assetId);
    }
    return NextResponse.json(updated);
  } catch (error) {
    return internalErrorResponse("PATCH /api/assets/:assetId", error);
  }
}

/**
 * DELETE /api/assets/:assetId — Soft Delete
 *
 * HTTP -> GetAssetUseCase (existência) + DeleteStoredAssetUseCase -> AssetService
 *      -> AssetRepository (soft delete) + StorageAdapter (remove o arquivo, se houver)
 *
 * Usa `DeleteStoredAssetUseCase`, não só `DeleteAssetUseCase`: remover um
 * Asset que já teve um arquivo enviado sem também remover esse arquivo do
 * Storage deixaria um arquivo órfão para sempre — a rota não acessa o
 * Storage diretamente em nenhum momento, só através do Use Case (que já
 * decide, dentro do AssetService, se há algo para remover no Storage).
 *
 * `StorageFileNotFoundError` é importado só como um tipo de erro para
 * `instanceof` — nunca é chamado nenhum método de `StorageAdapter` aqui.
 * O `AssetRepository` nunca limpa `storageKey` após um delete bem-sucedido
 * (comportamento já existente, congelado nesta Task), então uma segunda
 * chamada de DELETE no mesmo Asset tenta remover de novo um arquivo que
 * já não existe mais no Storage — sem este tratamento, isso apareceria
 * como 500 para o cliente por uma ação que, do ponto de vista HTTP
 * (idempotência de DELETE), já é um sucesso.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { assetId: string } }) {
  const existing = await assetUseCases.getAsset.execute({ assetId: params.assetId });
  if (!existing) {
    return ASSET_NOT_FOUND(params.assetId);
  }

  try {
    await assetUseCases.deleteStoredAsset.execute({ assetId: params.assetId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof StorageFileNotFoundError) {
      return new NextResponse(null, { status: 204 });
    }
    return internalErrorResponse("DELETE /api/assets/:assetId", error);
  }
}
