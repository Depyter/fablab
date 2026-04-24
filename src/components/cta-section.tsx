"use client";

import { CtaButton } from "@/components/cta-button";

type CtaSectionProps = {
  title: string;
  description?: string;
  buttonLabel: string;
  buttonHref?: string;
  className?: string;
};

export function CtaSection({
  title,
  description,
  buttonLabel,
  buttonHref,
  className,
}: CtaSectionProps) {
  return (
    <section
      className={`relative z-10 border-t-8 border-black bg-fab-purple p-16 text-center text-white sm:p-32 lg:p-64 ${className ?? ""}`}
    >
      <div
        aria-hidden="true"
        className=" pointer-events-none absolute inset-0 h-full w-full opacity-40"
      ></div>

      <h2 className="relative z-10 text-5xl font-black uppercase tracking-tighter sm:text-8xl">
        {title}
      </h2>

      {description ? (
        <p className="relative z-10 mx-auto mt-8 max-w-4xl text-2xl font-bold leading-tight sm:mt-12 lg:text-4xl">
          {description}
        </p>
      ) : null}

      <div className="relative z-10 mt-12 flex justify-center sm:mt-24">
        <CtaButton label={buttonLabel} href={buttonHref} />
      </div>
    </section>
  );
}
