import { NextResponse } from "next/server";
import { useCases } from "@/lib/application/container";

const PROJECT_NOT_FOUND = (projectId: string) => ({
  error: {
    code: "PROJECT_NOT_FOUND",
    message: `Nenhum pipeline encontrado para o projeto "${projectId}".`,
  },
});

/**
 * POST /api/pipeline/:projectId/versions
 * Corpo esperado: `{ "name": "Versão Inicial" }`
 *
 * HTTP → CreateVersionUseCase → PipelineService → PipelineRepository → Prisma → PostgreSQL
 */
export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const body = await request.json().catch(() => null);
  const name = body?.name as string | undefined;

  if (!name || !name.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "VERSION_NAME_REQUIRED",
          message: 'Campo "name" é obrigatório no corpo da requisição.',
        },
      },
      { status: 400 }
    );
  }

  const version = await useCases.createVersion.execute({ projectId: params.projectId, name: name.trim() });

  if (!version) {
    return NextResponse.json(PROJECT_NOT_FOUND(params.projectId), { status: 404 });
  }

  return NextResponse.json(version, { status: 201 });
}

/**
 * GET /api/pipeline/:projectId/versions
 * Resposta: `[{ id, name, createdAt }]`, mais recente primeiro — sem o
 * payload completo do snapshot (isso é uma Task futura, de detalhe).
 */
export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const versions = await useCases.listVersions.execute({ projectId: params.projectId });

  if (!versions) {
    return NextResponse.json(PROJECT_NOT_FOUND(params.projectId), { status: 404 });
  }

  return NextResponse.json(versions);
}
