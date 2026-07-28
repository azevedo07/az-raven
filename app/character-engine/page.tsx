import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { characters } from "@/lib/data";

const fields: { key: keyof (typeof characters)[number]; label: string }[] = [
  { key: "objetivo", label: "Objetivo" },
  { key: "conflito", label: "Conflito" },
  { key: "personalidade", label: "Personalidade" },
  { key: "estadoEmocional", label: "Estado emocional" },
  { key: "transformacao", label: "Transformação" },
  { key: "linguagemCorporal", label: "Linguagem corporal" },
  { key: "tomDeVoz", label: "Tom de voz" },
  { key: "visual", label: "Visual" },
];

export default function CharacterEnginePage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">Character Engine</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">
          Ficha de direção completa de cada personagem de &quot;O Corvo&quot;.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {characters.map((c) => (
          <div key={c.name} className="overflow-hidden rounded border border-border bg-card">
            <div className="border-b border-border bg-panel px-4 py-4">
              <div className="text-[15px] font-bold">{c.name}</div>
              <Badge tone="gold">{c.role}</Badge>
            </div>
            <div className="flex flex-col gap-2.5 p-4">
              {fields.map((f) => (
                <div key={f.key} className="text-[12px]">
                  <span className="text-textTertiary">{f.label}: </span>
                  <span className="text-textSecondary">{c[f.key]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
