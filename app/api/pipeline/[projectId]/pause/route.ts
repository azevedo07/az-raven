import { useCases } from "@/lib/application/container";
import { respondToAction } from "../../_lib/respond";

/**
 * POST /api/pipeline/:projectId/pause
 *
 * HTTP → PauseProjectUseCase → PipelineService → PipelineEngine → Registry
 *                                              ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(_request: Request, { params }: { params: { projectId: string } }) {
  return respondToAction(
    () => useCases.pauseProject.execute({ projectId: params.projectId }),
    "PAUSE_PROJECT_FAILED"
  );
}
