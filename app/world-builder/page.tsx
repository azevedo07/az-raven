import Card from "@/components/ui/Card";
import { worldBible } from "@/lib/data";

export default function WorldBuilderPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">World Builder</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">
          A World Bible completa de &quot;O Corvo&quot; — o universo sensorial da produção.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {worldBible.map((w) => (
          <Card key={w.label} flat>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">{w.label}</div>
            <div className="mt-1.5 text-[12.5px] leading-relaxed text-textSecondary">{w.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
