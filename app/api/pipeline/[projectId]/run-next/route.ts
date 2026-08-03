import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../_lib/respond";

/**
 * POST /api/pipeline/:projectId/run-next
 *
 * HTTP → RunNextModuleUseCase → PipelineService → PipelineEngine → Registry
 *                                               ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(_request: Request, { params }: { params: { projectId: string } }) {
  return respondToAction(
    () => useCases.runNextModule.execute({ projectId: params.projectId }),
    "RUN_NEXT_MODULE_FAILED"
  );
}
