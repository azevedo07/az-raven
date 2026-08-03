import { NextResponse } from "next/server";
import { useCases } from "@/lib/application/container";

/**
 * POST /api/pipeline/:projectId/versions/:versionId/restore
 * Resposta 200: `{ state, projectStatus }`. Resposta 404: "Version not found".
 *
 * HTTP → RestoreVersionUseCase → PipelineService → PipelineEngine.fromPersistedState()
 *                                                 ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(
  _request: Request,
  { params }: { params: { projectId: string; versionId: string } }
) {
  const result = await useCases.restoreVersion.execute({
    projectId: params.projectId,
    versionId: params.versionId,
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: "VERSION_NOT_FOUND", message: "Version not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
