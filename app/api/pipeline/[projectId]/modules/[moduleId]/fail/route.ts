import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../../../_lib/respond";
import type { ModuleId } from "@/lib/pipeline-core/types";

/**
 * POST /api/pipeline/:projectId/modules/:moduleId/fail
 *
 * HTTP → FailModuleUseCase → PipelineService → PipelineEngine → Registry
 *                                             ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(
  _request: Request,
  { params }: { params: { projectId: string; moduleId: string } }
) {
  return respondToAction(
    () => useCases.failModule.execute({ projectId: params.projectId, moduleId: params.moduleId as ModuleId }),
    "FAIL_MODULE_FAILED"
  );
}
