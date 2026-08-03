import { NextRequest, NextResponse } from "next/server";
import { assetUseCases } from "@/lib/assets/container";
import { StorageFileNotFoundError } from "@/lib/storage/storageErrors";
import { errorResponse, internalErrorResponse } from "../../_lib/respond";

/**
 * GET /api/assets/:assetId/download — Download do arquivo
 *
 * HTTP -> GetAssetUseCase (nome original, para o Content-Disposition)
 *      -> DownloadAssetUseCase -> AssetService -> StorageAdapter
 *
 * Nunca instancia nem chama `LocalStorageAdapter` diretamente — só os
 * Use Cases. `StorageFileNotFoundError` é importado só como um tipo de
 * erro para `instanceof` (tradução de erro para status HTTP), não como
 * acesso a Storage — a rota nunca chama nenhum método de `StorageAdapter`.
 */
export async function GET(_request: NextRequest, { params }: { params: { assetId: string } }) {
  const asset = await assetUseCases.getAsset.execute({ assetId: params.assetId });
  if (!asset) {
    return errorResponse(404, "ASSET_NOT_FOUND", `Nenhum Asset encontrado com id "${params.assetId}".`);
  }

  try {
    const downloaded = await assetUseCases.downloadAsset.execute({ assetId: params.assetId });

    if (!downloaded) {
      return errorResponse(
        404,
        "FILE_NOT_UPLOADED",
        `O Asset "${params.assetId}" ainda não teve nenhum arquivo enviado.`
      );
    }

    // Buffer -> Uint8Array puro: o tipo `BodyInit` do runtime não
    // reconhece `Buffer` diretamente (mesmo sendo, na prática, um
    // Uint8Array). A resposta é transmitida ao cliente pelo runtime
    // HTTP do Next.js, mas o conteúdo já chega inteiro em memória aqui:
    // `StorageAdapter.download()` devolve um Buffer completo, nunca um
    // stream (contrato congelado nesta Task — ver "Débitos técnicos" no
    // relatório final).
    return new NextResponse(new Uint8Array(downloaded.data), {
      status: 200,
      headers: {
        "Content-Type": downloaded.contentType,
        "Content-Length": String(downloaded.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(asset.originalName)}"`,
      },
    });
  } catch (error) {
    if (error instanceof StorageFileNotFoundError) {
      return errorResponse(
        404,
        "FILE_NOT_FOUND",
        `O arquivo do Asset "${params.assetId}" não foi encontrado no armazenamento.`
      );
    }
    return internalErrorResponse("GET /api/assets/:assetId/download", error);
  }
}
