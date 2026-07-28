import { ReactNode } from "react";

type Tone = "gold" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  gold: "bg-accentSoft text-accent",
  success: "bg-successSoft text-success",
  warning: "bg-warningSoft text-warning",
  danger: "bg-dangerSoft text-[#f2a19d]",
  neutral: "bg-white/[0.06] text-textSecondary",
};

export default function Badge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses[tone],
      ].join(" ")}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  if (status === "andamento" || status === "aprovado" || status === "done") return "gold";
  if (status === "revisao" || status === "em revisão" || status === "active") return "warning";
  if (status === "concluido") return "success";
  return "neutral";
}
