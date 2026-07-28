import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { qualityAudit } from "@/lib/data";

export default function QualityDirectorPage() {
  const average = qualityAudit.reduce((sum, q) => sum + q.score, 0) / qualityAudit.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">AZ Quality Director</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Auditoria cinematográfica final — &quot;Toda arte em busca da perfeição.&quot;
          </p>
        </div>
        <Badge tone="gold">Nota geral: {average.toFixed(2)}</Badge>
      </div>

      <Card>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Avaliação por categoria
        </div>
        <div className="flex flex-col">
          {qualityAudit.map((q) => (
            <div
              key={q.name}
              className="grid grid-cols-[1fr_60px] items-center gap-3.5 border-b border-border py-3 last:border-b-0"
            >
              <div>
                <div className="text-[13px] font-semibold text-white">{q.name}</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed text-textTertiary">{q.note}</div>
              </div>
              <div
                className={[
                  "text-right font-mono text-lg font-bold",
                  q.score >= 9 ? "text-success" : "text-warning",
                ].join(" ")}
              >
                {q.score.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card flat>
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Melhorias sugeridas
          </div>
          <div className="flex flex-col gap-2 text-[12.5px]">
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-textTertiary">Continuidade</span>
              <span className="text-white">Recalibrar a vela na Cena 05</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-textTertiary">Ritmo</span>
              <span className="text-white">Cortar ~8s da Cena 05</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-textTertiary">Áudio</span>
              <span className="text-white">Mais variação na narração</span>
            </div>
          </div>
        </Card>
        <div className="flex items-start gap-3 rounded-sm border border-[rgba(212,175,55,0.25)] bg-accentSoft p-4 text-[13px] text-[#e9d8a3]">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-[17px] w-[17px] flex-none text-accent" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9.5" />
            <line x1="12" y1="8" x2="12" y2="8.1" />
            <line x1="12" y1="11.5" x2="12" y2="16" />
          </svg>
          <div>
            <strong className="font-semibold text-white">Nunca é um veredito automático.</strong> O Quality
            Director aponta onde a obra ainda não alcançou a perfeição prometida pela marca — a decisão de
            exportar continua sendo do diretor humano.
          </div>
        </div>
      </div>
    </div>
  );
}
