import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function LiteraryDirectorPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">Literary Director</h1>
          <p className="mt-1 text-[13.5px] text-textSecondary">
            Análise narrativa de <strong className="font-semibold text-white">&quot;O Corvo&quot;</strong>, Edgar Allan Poe.
          </p>
        </div>
        <Badge tone="success" dot>
          Análise concluída
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card flat>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Tema central</div>
          <div className="mt-2 text-[16px] font-semibold">
            Luto, memória e a busca inútil por alívio racional diante da perda
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-textSecondary">
            O poema explora a deterioração psicológica de um homem que recusa aceitar a morte de
            sua amada, encontrando na repetição obsessiva do corvo o eco de sua própria negação.
          </p>
        </Card>
        <Card flat>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Conflito dramático</div>
          <div className="mt-2 text-[16px] font-semibold">Razão vs. desespero</div>
          <p className="mt-2 text-[13px] leading-relaxed text-textSecondary">
            O narrador tenta racionalizar a presença do corvo, mas cada resposta corrói sua
            estabilidade mental, empurrando-o da curiosidade à loucura.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card flat>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Emoções dominantes</div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">Melancolia</Badge>
            <Badge tone="gold">Desespero crescente</Badge>
            <Badge tone="gold">Nostalgia</Badge>
            <Badge tone="danger">Loucura</Badge>
            <Badge tone="neutral">Curiosidade inicial</Badge>
          </div>
        </Card>
        <Card flat>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Objetos simbólicos</div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Busto de Palas Atena</Badge>
            <Badge tone="neutral">Porta e janela</Badge>
            <Badge tone="neutral">Cortina púrpura</Badge>
            <Badge tone="neutral">Lareira moribunda</Badge>
            <Badge tone="neutral">O corvo</Badge>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Personagens</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card flat hoverable>
            <div className="text-[13.5px] font-semibold">O Narrador</div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-textTertiary">
              Um homem em luto profundo, à beira da insônia e da razão.
            </div>
          </Card>
          <Card flat hoverable>
            <div className="text-[13.5px] font-semibold">O Corvo</div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-textTertiary">
              Presença ambígua — ave, presságio ou projeção da mente do narrador.
            </div>
          </Card>
          <Card flat hoverable>
            <div className="text-[13.5px] font-semibold">Lenora</div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-textTertiary">
              Amada falecida, presente apenas como memória e ausência.
            </div>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Linha narrativa</div>
        <div className="flex flex-col">
          {[
            "Homem sozinho à meia-noite, lendo, tentando esquecer a perda.",
            "Uma batida na porta interrompe o silêncio; ele investiga, mas não há ninguém.",
            "A janela se abre; o corvo entra e pousa sobre o busto de Palas.",
            "O narrador interroga a ave por diversão, recebendo sempre a mesma resposta.",
            "As perguntas tornam-se desesperadas; a resposta final sela sua ruína emocional.",
          ].map((line, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
              <Badge tone="gold">{String(i + 1).padStart(2, "0")}</Badge>
              <span className="text-[13.5px] text-textSecondary">{line}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
