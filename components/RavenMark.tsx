export default function RavenMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ravenMarkGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E8CB6B" />
          <stop offset="1" stopColor="#AD8524" />
        </linearGradient>
      </defs>
      <path
        d="M18 62 C16 44 30 24 50 22 C64 21 74 30 76 40 C68 37 60 39 56 45 C66 46 72 54 70 64 C68 76 54 82 40 80 C46 72 44 62 36 58 C28 63 20 66 14 62 Z"
        fill="url(#ravenMarkGradient)"
      />
      <circle cx="60" cy="34" r="2.4" fill="#0B0D10" />
      <path d="M74 36 L83 32 L76 41 Z" fill="#D4AF37" />
      <path
        d="M32 76 C28 82 24 86 20 88"
        stroke="#D4AF37"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity=".8"
      />
    </svg>
  );
}
