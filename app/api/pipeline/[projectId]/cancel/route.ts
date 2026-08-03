import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../_lib/respond";

/**
 * POST /api/pipeline/:projectId/cancel
 *
 * HTTP → CancelProjectUseCase → PipelineService → PipelineEngine → Registry
 *                                               ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(_request: Request, { params }: { params: { projectId: string } }) {
  return respondToAction(
    () => useCases.cancelProject.execute({ projectId: params.projectId }),
    "CANCEL_PROJECT_FAILED"
  );
}
