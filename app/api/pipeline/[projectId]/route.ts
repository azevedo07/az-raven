import { NextResponse } from "next/server";
import { getPipelineState } from "@/lib/pipeline-service/pipelineService";

/**
 * GET /api/pipeline/:projectId
 *
 * Única porta HTTP para o estado do Pipeline Core. Esta rota importa
 * apenas o Pipeline Service — nunca `PipelineEngine` nem `registry`
 * diretamente:
 *
 *   UI → API (esta rota) → Pipeline Service → Pipeline Engine → Registry
 *
 * Só expõe leitura de estado porque é só isso que o Pipeline Service
 * oferece hoje (`getPipelineState`). Ações mutáveis (start/finish/fail/
 * retry/pause/resume/cancel) dependem de casos de uso ainda não
 * implementados no Service — ficam para uma Task futura.
 */
export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const state = getPipelineState(params.projectId);

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
