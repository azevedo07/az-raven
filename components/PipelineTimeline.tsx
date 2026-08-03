"use client";

import { useEffect, useState } from "react";
import Card from "./ui/Card";
import Badge from "./ui/Badge";

interface TimelineEntry {
  createdAt: string;
  type: string;
  moduleId: string | null;
}

/**
 * Rótulo de exibição ("status") para cada tipo de evento do pipeline —
 * os mesmos 9 tipos de `PipelineEngineEvent` (Sprint 1.1).
 */
const EVENT_LABEL: Record<string, string> = {
  "project-started": "Projeto iniciado",
  "project-paused": "Projeto pausado",
  "project-resumed": "Projeto retomado",
  "project-cancelled": "Projeto cancelado",
  "project-completed": "Projeto concluído",
  "module-started": "Em andamento",
  "module-finished": "Concluído",
  "module-failed": "Falhou",
  "module-retried": "Reiniciado",
  // Evento sintético (Sprint 1.5, Task 5) — não vem do PipelineEngine,
  // é gravado pelo Service ao restaurar uma versão.
  VERSION_RESTORED: "Versão restaurada",
};

const EVENT_TONE: Record<string, "gold" | "success" | "warning" | "danger" | "neutral"> = {
  "project-started": "gold",
  "project-paused": "neutral",
  "project-resumed": "gold",
  "project-cancelled": "danger",
  "project-completed": "success",
  "module-started": "gold",
  "module-finished": "success",
  "module-failed": "danger",
  "module-retried": "warning",
  VERSION_RESTORED: "warning",
};

/**
 * Linha do tempo de eventos do pipeline de um projeto (Sprint 1.5).
 *
 * Client Component deliberado: busca os dados via `fetch` na API pública
 * (`GET /api/pipeline/:projectId/timeline`), não através de `store.ts`/
 * `PipelineService` (que são server-only e inacessíveis a partir do
 * navegador). Nenhum acesso a Prisma ou a qualquer camada de servidor
 * aqui — só a chamada HTTP.
 */
export default function PipelineTimeline({
  projectId,
  refreshToken,
}: {
  projectId: string;
  /** Incrementar este valor recarrega a timeline sem recarregar a página — usado após restaurar uma versão (Sprint 1.5, Task 5). */
  refreshToken?: number;
}) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/pipeline/${projectId}/timeline`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar a linha do tempo do pipeline.");
        }
        return response.json();
      })
      .then((data: TimelineEntry[]) => {
        if (!cancelled) setEntries(data);
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
      <div className="mb-3 text-[13.5px] font-semibold text-white">Linha do tempo</div>

      {error && <div className="text-[12px] text-danger">{error}</div>}

      {!error && entries === null && (
        <div className="text-[12px] text-textTertiary">Carregando linha do tempo…</div>
      )}

      {!error && entries !== null && entries.length === 0 && (
        <div className="text-[12px] text-textTertiary">Nenhum evento registrado ainda.</div>
      )}

      {!error && entries !== null && entries.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {entries.map((entry, index) => (
            <li
              key={index}
              className={[
                "grid grid-cols-[92px_1fr_auto] items-center gap-3 py-2.5",
                index !== entries.length - 1 ? "border-b border-border" : "",
              ].join(" ")}
            >
              <span className="font-mono text-[11px] text-textTertiary">
                {new Date(entry.createdAt).toLocaleTimeString("pt-BR")}
              </span>
              <span className="text-[12.5px] text-white">
                {entry.moduleId ?? "—"} <span className="text-textTertiary">· {entry.type}</span>
              </span>
              <Badge tone={EVENT_TONE[entry.type] ?? "neutral"}>{EVENT_LABEL[entry.type] ?? entry.type}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
