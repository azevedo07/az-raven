import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
  hoverable?: boolean;
  children: ReactNode;
}

export default function Card({
  flat = false,
  hoverable = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "rounded border border-border p-[18px]",
        flat ? "bg-panel" : "bg-card",
        hoverable
          ? "transition-all duration-200 ease-az hover:border-borderStrong hover:bg-cardHover hover:-translate-y-0.5"
          : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
