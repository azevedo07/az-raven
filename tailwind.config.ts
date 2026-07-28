import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D10",
        bg2: "#0D1014",
        panel: "#151A22",
        card: "#202733",
        cardHover: "#262F3D",
        border: "rgba(255,255,255,0.07)",
        borderStrong: "rgba(255,255,255,0.14)",
        textPrimary: "#FFFFFF",
        textSecondary: "#AAB2BF",
        textTertiary: "#6B7280",
        accent: "#D4AF37",
        accentSoft: "rgba(212,175,55,0.14)",
        accentSoftStrong: "rgba(212,175,55,0.28)",
        success: "#4CAF7D",
        successSoft: "rgba(76,175,125,0.14)",
        warning: "#E0A458",
        warningSoft: "rgba(224,164,88,0.14)",
        danger: "#E0605A",
        dangerSoft: "rgba(224,96,90,0.14)",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "7px",
        DEFAULT: "10px",
        lg: "16px",
      },
      boxShadow: {
        card: "0 10px 28px rgba(0,0,0,0.4)",
        lg: "0 20px 60px rgba(0,0,0,0.55)",
      },
      transitionTimingFunction: {
        az: "cubic-bezier(.4,0,.2,1)",
      },
    },
  },
  plugins: [],
};
export default config;
