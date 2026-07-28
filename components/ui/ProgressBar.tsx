export default function ProgressBar({
  value,
  size = "md",
}: {
  value: number;
  size?: "md" | "lg";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={[
        "w-full overflow-hidden rounded-full bg-white/[0.06]",
        size === "lg" ? "h-2.5" : "h-[7px]",
      ].join(" ")}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#a9852b] to-accent transition-[width] duration-500 ease-az"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
