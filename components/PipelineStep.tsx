import { PipelineModule } from "@/lib/types";
import ProgressBar from "./ui/ProgressBar";
import Badge from "./ui/Badge";

const statusLabel: Record<string, string> = {
  done: "Concluído",
  active: "Em andamento",
  pending: "Pendente",
};

const statusTone: Record<string, "success" | "gold" | "neutral"> = {
  done: "success",
  active: "gold",
  pending: "neutral",
};

function StatusIcon({ status }: { status: PipelineModule["status"] }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2.4">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === "active") {
    return (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 7v5l3.2 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9.5" strokeDasharray="2 4" />
    </svg>
  );
}

export default function PipelineStep({ module, isLast }: { module: PipelineModule; isLast: boolean }) {
  const nodeClass = {
    done: "bg-successSoft border-success text-success",
    active: "bg-accentSoft border-accent text-accent",
    pending: "bg-white/[0.03] border-borderStrong text-textTertiary",
  }[module.status];

  return (
    <div className={["grid grid-cols-[40px_1fr_auto] items-center gap-3.5 py-3.5", !isLast ? "border-b border-border" : ""].join(" ")}>
      <div className={["flex h-10 w-10 flex-none items-center justify-center rounded-md border", nodeClass].join(" ")}>
        <StatusIcon status={module.status} />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-bold text-white">{module.title}</span>
          <Badge tone={statusTone[module.status]}>{statusLabel[module.status]}</Badge>
        </div>
        <div className="mt-0.5 text-[11px] text-textTertiary">{module.description}</div>
        <div className="mt-1.5 max-w-[340px]">
          <ProgressBar value={module.pct} />
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold text-white">{module.pct}%</div>
        <div className="text-[10.5px] text-textTertiary">{module.eta}</div>
      </div>
    </div>
  );
}
