import { NextResponse } from "next/server";
import { useCases } from "@/lib/application/container";

export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const dashboard = await useCases.getPipelineDashboard.execute({ projectId: params.projectId });

  if (!dashboard) {
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

  return NextResponse.json(dashboard);
}
