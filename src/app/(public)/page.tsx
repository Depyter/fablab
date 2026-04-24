"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CtaSection } from "@/components/cta-section";
import { CtaButton } from "@/components/cta-button";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
  <CtaButton
    href={href}
    label={String(children)}
    variant={variant === "primary" ? "primary" : "footer"}
    className={className}
  />
);

/** Splits a word into per-character mask-reveal spans */
function SplitWord({ word }: { word: string }) {
  return (
    <span className="inline-flex">
      {word.split("").map((char, i) => (
        <span key={i} className="inline-block leading-[0.85]">
          <span
            data-char
            className="inline-block will-change-transform"
            style={{ opacity: 0 }}
          >
            {char}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function HomePage() {
  const stripRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = pageRef.current;
        if (!root) return;

        const chars = Array.from(
          root.querySelectorAll<HTMLElement>("[data-char]"),
        );

        if (!chars.length) return;

        const firstChar = chars[0];
        const otherChars = chars.slice(1);

        gsap.set(chars, { opacity: 1 });

        // messy initial state for everyone
        gsap.set(chars, {
          x: () => gsap.utils.random(-20, 12),
          y: () => gsap.utils.random(-25, 45),
          rotation: () => gsap.utils.random(-90, 90),
        });

        gsap.set(
          chars.filter((_, i) => i % 4 === 0),
          { rotation: 180 },
        );

        const tl = gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
        });

        // everyone except M fixes fully
        tl.to(otherChars, {
          rotation: 0,
          duration: 0.6,
          stagger: 0.04,
        });

        tl.to(otherChars, {
          x: 0,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
        });

        // M fixes too, but overshoots
        tl.to(
          firstChar,
          {
            x: -10, // overshoot
            y: 5,
            rotation: -13,
            scale: 1,
            duration: 1,
            ease: "power3.out",
          },
          0, // start with everyone else
        );

        // Make the 'M' interactive so it only fixes on click
        firstChar.style.cursor = "pointer";

        const fixFirstChar = () => {
          gsap.to(firstChar, {
            x: 0,
            y: 0,
            rotation: 0,
            duration: 0.5,
            ease: "back.out(2)",
          });

          // Clean up styles and listener after it's fixed
          firstChar.style.cursor = "default";
          firstChar.removeEventListener("click", fixFirstChar);
        };

        firstChar.addEventListener("click", fixFirstChar);

        // Cleanup function for the matchMedia block
        return () => {
          firstChar.removeEventListener("click", fixFirstChar);
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const root = pageRef.current;
        if (!root) return;

        gsap.set(root.querySelectorAll("[data-char]"), {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
        });
      });
    },
    { scope: pageRef },
  );

  /* ── Marquee ticker (GSAP-native) ── */
  useGSAP(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const halfWidth = strip.scrollWidth / 2;

    gsap.to(strip, {
      x: -halfWidth,
      duration: 120,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: (x) => `${parseFloat(x) % halfWidth}px`,
      },
    });
  });

  const marqueeText =
    "3D Printing • Laser Cutting • CNC Milling • 3D Scanning • Workshops • Pottery • Vacuum Forming • Tambay • ";

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-hidden bg-background"
    >
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-[size:120px_120px] opacity-35" />

      {/* Hero Section */}
      <section className="relative z-10 flex min-h-[75vh] flex-col items-center justify-center px-4 pt-10 pb-10 text-center sm:px-6 lg:px-8">
        <div className="z-10 space-y-8">
          <h1 className="max-w-7xl text-6xl leading-[0.85] font-black tracking-tighter text-black sm:text-9xl lg:text-[14rem]">
            <span data-line className="block">
              <SplitWord word="MAKE" />
            </span>
            <span data-line className="block">
              <SplitWord word="ALMOST" />
            </span>
            <span data-line className="block">
              <SplitWord word="ANYTHING." />
            </span>
          </h1>

          <div className="flex flex-col items-center justify-center gap-8 pt-8 sm:flex-row">
            <ActionButton href="/login">Start A Project</ActionButton>
          </div>
        </div>
      </section>

      {/* Scrolling Ticker — marquee */}
      <div className="relative z-10 overflow-hidden border-y-8 border-black bg-black py-8 sm:py-12 select-none">
        <div
          ref={stripRef}
          className="flex cursor-grab whitespace-nowrap"
          style={{ willChange: "transform" }}
        >
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
      <section className="relative z-10 min-h-[40vh] border-black" />

      {/* Call to Action */}
      <CtaSection
        title="Ready to Build?"
        buttonLabel="Start a Project"
        buttonHref="/login"
        className="lg:p-48"
      />
    </main>
  );
}
