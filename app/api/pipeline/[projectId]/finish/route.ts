import { NextResponse } from "next/server";
import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../_lib/respond";
import type { ModuleId } from "@/lib/pipeline-core/types";

/**
 * POST /api/pipeline/:projectId/finish
 * Corpo esperado: `{ "moduleId": "literary-director" }`
 *
 * HTTP → FinishModuleUseCase → PipelineService → PipelineEngine → Registry
 *                                              ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const body = await request.json().catch(() => null);
  const moduleId = body?.moduleId as ModuleId | undefined;

  if (!moduleId) {
    return NextResponse.json(
      {
        error: {
          code: "MODULE_ID_REQUIRED",
          message: 'Campo "moduleId" é obrigatório no corpo da requisição.',
        },
      },
      { status: 400 }
    );
  }

  return respondToAction(
    () => useCases.finishModule.execute({ projectId: params.projectId, moduleId }),
    "FINISH_MODULE_FAILED"
  );
}
