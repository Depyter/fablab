"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const ActionButton = ({
  href,
  children,
  className,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) => (
  <Link href={href} className="block w-full sm:w-auto">
    <Button
      size="lg"
      className={cn(
        "group h-20 w-full rounded-none border-4 border-black px-10 text-xl font-black uppercase tracking-tighter transition-colors duration-150 sm:h-28 sm:w-auto sm:px-16 sm:text-3xl",
        variant === "primary"
          ? "bg-fab-magenta text-white hover:bg-fab-teal"
          : "bg-fab-amber text-black hover:bg-fab-magenta hover:text-white",
        className,
      )}
    >
      {children}
    </Button>
  </Link>
);

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "50px",
      },
    );

    const elements = document.querySelectorAll("[data-animate]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const marqueeText =
    "3D Printing • Laser Cutting • CNC Milling • Electronics • Woodworking • Metalworking • Design • ";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Consistent Massive Grid Background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_2px,transparent_2px),linear-gradient(to_bottom,var(--border)_2px,transparent_2px)] bg-[size:120px_120px] opacity-25" />

      {/* Hero Section */}
      <section className="relative z-10 flex min-h-[75vh] flex-col items-center justify-center px-4 pt-10 pb-10 text-center sm:px-6 lg:px-8">
        <div className="landing-reveal z-10 space-y-8" data-animate>
          <h1 className="max-w-7xl text-6xl leading-[0.8] font-black tracking-tighter text-black sm:text-9xl lg:text-[14rem]">
            MAKE
            <br />
            ALMOST
            <br />
            ANYTHING.
          </h1>

          <div className="flex flex-col items-center justify-center gap-8 pt-8 sm:flex-row">
            <ActionButton href="/login">Start A Project</ActionButton>
          </div>
        </div>
      </section>

      {/* Scrolling Ticker - Robust Implementation */}
      <div className="relative z-10 overflow-hidden border-y-8 border-black bg-black py-8 sm:py-12">
        <div className="flex animate-marquee whitespace-nowrap">
          <div className="flex shrink-0 items-center gap-12 px-6 text-5xl font-black uppercase tracking-tighter text-white sm:text-7xl lg:text-8xl">
            {[...Array(4)].map((_, i) => (
              <span key={i}>{marqueeText}</span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-12 px-6 text-5xl font-black uppercase tracking-tighter text-white sm:text-7xl lg:text-8xl">
            {[...Array(4)].map((_, i) => (
              <span key={i}>{marqueeText}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <section className="relative z-10 grid border-b-8 border-black md:grid-cols-2">
        <div className="border-b-8 border-black bg-fab-amber p-12 md:border-r-8 lg:p-20">
          <h2 className="text-5xl font-black leading-none tracking-tighter uppercase sm:text-7xl lg:text-8xl">
            Open
            <br />
            Access
          </h2>
        </div>
        <div className="border-b-8 border-black bg-fab-magenta p-12 text-white lg:p-20">
          <h2 className="text-5xl font-black leading-none tracking-tighter uppercase sm:text-7xl lg:text-8xl">
            Skill
            <br />
            Building
          </h2>
        </div>
        <div className="border-b-8 border-black bg-fab-teal p-12 text-white md:border-r-8 md:border-b-0 lg:p-20">
          <h2 className="text-5xl font-black leading-none tracking-tighter uppercase sm:text-7xl lg:text-8xl">
            Rapid
            <br />
            Prototyping
          </h2>
        </div>
        <div className="bg-fab-purple p-12 text-white lg:p-20">
          <h2 className="text-5xl font-black leading-none tracking-tighter uppercase sm:text-7xl lg:text-8xl">
            Green
            <br />
            Making
          </h2>
        </div>
      </section>

      {/* Blank Section */}
      <section className="relative z-10 min-h-[40vh] border-b-8 border-black">
        {/* Intentionally left blank */}
      </section>

      {/* Call to Action */}
      <section className="relative z-10 bg-black p-16 text-center text-white sm:p-32 lg:p-48">
        <h2 className="text-5xl font-black leading-tight tracking-tighter uppercase sm:text-9xl">
          Ready to Build?
        </h2>
        <div className="mt-12 flex justify-center sm:mt-20">
          <ActionButton href="/login" variant="secondary">
            Start a Project
          </ActionButton>
        </div>
      </section>

      <footer className="relative z-10 bg-background py-16 text-center sm:py-24 border-black">
        <p className="text-xl font-black uppercase tracking-tighter text-black sm:text-3xl">
          FabLab UP Cebu • Cebu City • © 2024
        </p>
      </footer>

      <style jsx>{`
        .landing-reveal {
          opacity: 0;
          transform: translateY(40px);
          transition:
            transform 0.5s cubic-bezier(0.2, 0.75, 0.2, 1),
            opacity 0.5s ease;
        }

        .landing-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-100%);
          }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </main>
  );
}
