import { NextResponse } from "next/server";
import { useCases } from "@/lib/application/container";

/**
 * GET /api/pipeline/:projectId/timeline
 *
 * HTTP → GetPipelineTimelineUseCase → PipelineService → PipelineRepository → Prisma → PostgreSQL
 *
 * Só leitura — nenhum Engine envolvido (histórico já persistido, não
 * estado de execução em memória).
 */
export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const timeline = await useCases.getPipelineTimeline.execute({ projectId: params.projectId });

  if (!timeline) {
    return NextResponse.json(
      {
        error: {
          code: "PROJECT_NOT_FOUND",
          message: `Nenhum pipeline encontrado para o projeto "${params.projectId}".`,
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json(timeline);
}
