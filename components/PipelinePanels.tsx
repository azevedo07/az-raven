"use client";

import { useCallback, useState } from "react";
import PipelineDashboard from "./PipelineDashboard";
import PipelineVersions from "./PipelineVersions";
import PipelineTimeline from "./PipelineTimeline";

/**
 * Agrupa Dashboard, Versões e Timeline de um projeto sob um `refreshToken`
 * compartilhado (Sprint 1.5, Task 5) — restaurar uma versão precisa
 * atualizar os três sem recarregar a página. `PipelineVersions` já se
 * recarrega sozinho depois de criar/restaurar; este componente pai só
 * existe para que uma restauração também avise Dashboard e Timeline,
 * que não têm outro jeito de saber que o estado mudou por baixo deles.
 */
export default function PipelinePanels({ projectId }: { projectId: string }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const handleRestored = useCallback(() => setRefreshToken((token) => token + 1), []);

  return (
    <>
      <PipelineDashboard projectId={projectId} refreshToken={refreshToken} />
      <PipelineVersions projectId={projectId} onRestored={handleRestored} />
      <PipelineTimeline projectId={projectId} refreshToken={refreshToken} />
    </>
  );
}
