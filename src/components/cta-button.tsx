"use client";

import { GsapArrowButton } from "@/components/ui/push-up-button";

type CtaButtonProps = {
  label: string;
  href?: string;
  className?: string;
  variant?: "primary" | "footer";
};

export function CtaButton({
  label,
  href,
  className,
  variant = "footer",
}: CtaButtonProps) {
  return (
    <GsapArrowButton
      href={href}
      label={label}
      className={`${
        variant === "primary"
          ? "min-h-20 w-full sm:min-h-28 sm:w-auto sm:min-w-[24rem]"
          : "min-h-20 bg-white px-12 py-6 sm:min-h-24 sm:w-auto sm:px-24 sm:py-10"
      } ${className ?? ""}`}
      baseBackground={variant === "primary" ? "var(--fab-magenta)" : "#ffffff"}
      hoverBackground={variant === "primary" ? "var(--fab-teal)" : "#000000"}
      baseTextColor={variant === "primary" ? "#ffffff" : "var(--foreground)"}
      hoverTextColor="#ffffff"
    />
  );
}
