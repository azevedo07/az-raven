import { NextResponse } from "next/server";
import { useCases } from "@/lib/application/container";

/**
 * GET /api/pipeline/:projectId/state
 *
 * Única porta HTTP para consultar o estado do Pipeline Core. Esta rota
 * importa só `lib/application/container` — nunca `PipelineService`,
 * `PipelineRepository`, Prisma ou `PipelineEngine` diretamente:
 *
 *   HTTP → GetProjectStateUseCase → PipelineService → PipelineEngine → Registry
 *                                                    ↘ PipelineRepository → Prisma → PostgreSQL
 */
export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const state = await useCases.getProjectState.execute({ projectId: params.projectId });

  if (!state) {
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

  return NextResponse.json(state);
}
