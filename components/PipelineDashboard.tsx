"use client";

import { useEffect, useState } from "react";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import ProgressBar from "./ui/ProgressBar";

interface DashboardData {
  projectId: string;
  projectStatus: string;
  currentModule: string | null;
  progress: number;
  totalModules: number;
  completedModules: number;
  activeModules: number;
  failedModules: number;
  pendingModules: number;
  pausedModules: number;
  eventCount: number;
  startedAt: string;
  updatedAt: string;
  nextModule: string | null;
}

const MODULE_LABEL: Record<string, string> = {
  "literary-director": "Literary Director",
  "emotion-engine": "Emotion Engine",
  "character-engine": "Character Engine",
  "world-builder": "World Builder",
  storyboard: "Storyboard Engine",
  "director-engine": "Director Engine",
  "prompt-builder": "Prompt Builder",
  assets: "Assets",
  production: "Produção",
  "quality-director": "AZ Quality Director",
  "audience-intelligence": "Audience Intelligence",
  export: "Exportação",
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  idle: "Não iniciado",
  running: "Em execução",
  paused: "Pausado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

const PROJECT_STATUS_TONE: Record<string, "gold" | "success" | "warning" | "danger" | "neutral"> = {
  idle: "neutral",
  running: "gold",
  paused: "warning",
  cancelled: "danger",
  completed: "success",
};

function moduleLabel(moduleId: string | null): string {
  if (!moduleId) return "—";
  return MODULE_LABEL[moduleId] ?? moduleId;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-textTertiary">{label}</span>
      <span className="text-[13.5px] font-semibold text-white">{value}</span>
    </div>
  );
}

/**
 * Dashboard de Execução do Pipeline (Sprint 1.5, Task 3).
 *
 * Client Component deliberado: busca os dados via `fetch` na API pública
 * (`GET /api/pipeline/:projectId/dashboard`) — nenhum acesso a Prisma,
 * Repository ou PipelineService a partir do navegador.
 */
export default function PipelineDashboard({
  projectId,
  refreshToken,
}: {
  projectId: string;
  /** Incrementar este valor recarrega o dashboard sem recarregar a página — usado após restaurar uma versão (Sprint 1.5, Task 5). */
  refreshToken?: number;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/pipeline/${projectId}/dashboard`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o dashboard do pipeline.");
        }
        return response.json();
      })
      .then((json: DashboardData) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido.");
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshToken]);

  return (
    <Card>
      <div className="mb-3 text-[13.5px] font-semibold text-white">Dashboard de execução</div>

      {error && <div className="text-[12px] text-danger">{error}</div>}

      {!error && data === null && (
        <div className="text-[12px] text-textTertiary">Carregando dashboard…</div>
      )}

      {!error && data !== null && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone={PROJECT_STATUS_TONE[data.projectStatus] ?? "neutral"}>
              {PROJECT_STATUS_LABEL[data.projectStatus] ?? data.projectStatus}
            </Badge>
            <span className="text-[11px] text-textTertiary">
              Última atualização: {new Date(data.updatedAt).toLocaleString("pt-BR")}
            </span>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-[12.5px]">
              <span className="font-semibold text-white">Progresso geral</span>
              <span className="text-textTertiary">{data.progress}%</span>
            </div>
            <ProgressBar value={data.progress} size="lg" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Módulo atual" value={moduleLabel(data.currentModule)} />
            <Stat label="Próximo módulo" value={moduleLabel(data.nextModule)} />
            <Stat label="Eventos" value={data.eventCount} />
            <Stat label="Módulos concluídos" value={`${data.completedModules} de ${data.totalModules}`} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 border-t border-border pt-3 sm:grid-cols-5">
            <Stat label="Pendentes" value={data.pendingModules} />
            <Stat label="Ativos" value={data.activeModules} />
            <Stat label="Concluídos" value={data.completedModules} />
            <Stat label="Falharam" value={data.failedModules} />
            <Stat label="Pausados" value={data.pausedModules} />
          </div>
        </div>
      )}
    </Card>
  );
}
