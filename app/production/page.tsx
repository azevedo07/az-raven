import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import PipelineStep from "@/components/PipelineStep";
import PipelinePanels from "@/components/PipelinePanels";
import { getPipelineModules } from "@/lib/pipeline-core/store";

export default async function ProducaoPage() {
  const pipelineModules = await getPipelineModules();
  const doneCount = pipelineModules.filter((m) => m.status === "done").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Produção</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Pipeline cinematográfico de &quot;O Corvo — Edição Cinematográfica&quot;.
          </p>
        </div>
        <Badge tone="gold">64% concluído</Badge>
      </div>

      <Card>
        <div className="mb-2 flex justify-between text-[13.5px]">
          <span className="font-semibold text-white">Progresso geral do filme</span>
          <span className="text-textTertiary">
            {doneCount} de {pipelineModules.length} módulos concluídos
          </span>
        </div>
        <ProgressBar value={64} size="lg" />
      </Card>

      <Card>
        {pipelineModules.map((m, i) => (
          <PipelineStep key={m.title} module={m} isLast={i === pipelineModules.length - 1} />
        ))}
      </Card>

      <PipelinePanels projectId="o-corvo" />
    </div>
  );
}
