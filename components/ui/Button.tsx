"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-[#181008] hover:bg-[#e0bc4c] hover:-translate-y-px shadow-[0_8px_18px_rgba(212,175,55,0.22)]",
  secondary:
    "bg-card text-white border border-borderStrong hover:bg-cardHover hover:border-white/20",
  ghost: "bg-transparent text-textSecondary hover:bg-white/5 hover:text-white",
  danger: "bg-dangerSoft text-[#f2a19d] border border-[rgba(224,96,90,0.3)] hover:bg-[rgba(224,96,90,0.22)]",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-all duration-150 ease-az whitespace-nowrap",
        size === "md" ? "text-[13px] px-4 py-2.5" : "text-xs px-3 py-1.5",
        variantClasses[variant],
        disabled || loading ? "opacity-40 cursor-not-allowed !translate-y-0 !shadow-none" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {!loading && children}
    </button>
  );
}
