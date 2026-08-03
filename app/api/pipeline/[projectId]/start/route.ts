import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../_lib/respond";

/**
 * POST /api/pipeline/:projectId/start
 *
 * HTTP → StartProjectUseCase → PipelineService → PipelineEngine → Registry
 *                                              ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(_request: Request, { params }: { params: { projectId: string } }) {
  return respondToAction(
    () => useCases.startProject.execute({ projectId: params.projectId }),
    "START_PROJECT_FAILED"
  );
}
