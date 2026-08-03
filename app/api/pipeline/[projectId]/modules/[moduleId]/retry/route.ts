import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../../../_lib/respond";
import type { ModuleId } from "@/lib/pipeline-core/types";

/**
 * POST /api/pipeline/:projectId/modules/:moduleId/retry
 *
 * HTTP → RetryModuleUseCase → PipelineService → PipelineEngine → Registry
 *                                              ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(
  _request: Request,
  { params }: { params: { projectId: string; moduleId: string } }
) {
  return respondToAction(
    () => useCases.retryModule.execute({ projectId: params.projectId, moduleId: params.moduleId as ModuleId }),
    "RETRY_MODULE_FAILED"
  );
}
