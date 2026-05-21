"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu, X } from "lucide-react";
import { PublicNavItemContent } from "@/components/public-nav-item-content";
import { cn } from "@/lib/utils";

type PublicNavItem = {
  href: string;
  label: string;
  mobileClassName: string;
};

type PublicMobileNavCardProps = {
  items: readonly PublicNavItem[];
};

const mobileNavLinkClass =
  "group flex items-center justify-between rounded-[1.4rem] border-4 border-black bg-white px-5 py-4 text-black shadow-[5px_5px_0_0_#000] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0_0_#000]";

gsap.registerPlugin(useGSAP);

export function PublicMobileNavCard({ items }: PublicMobileNavCardProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const primaryItems = [
    ...items,
    {
      href: "/dashboard/chat",
      label: "Dashboard",
      mobileClassName:
        "bg-fab-magenta text-white hover:bg-fab-amber hover:text-black",
    },
  ] as const;

  const openMenu = () => {
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
  };

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const card = cardRef.current;
      const root = rootRef.current;
      if (!overlay || !card || !root) return;

      gsap.set(overlay, { opacity: 0 });
      gsap.set(card, {
        opacity: 0,
        x: 28,
        y: -16,
        rotation: 12,
        scale: 0.95,
      });

      timelineRef.current = gsap
        .timeline({ paused: true })
        .to(
          overlay,
          {
            opacity: 1,
            duration: 0.18,
            ease: "power1.out",
          },
          0,
        )
        .to(
          card,
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: -2,
            scale: 1,
            duration: 0.26,
            ease: "power2.out",
          },
          0,
        );
    },
    { scope: rootRef },
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    if (open) {
      timeline.play();
      return;
    }

    timeline.reverse();
  }, [open]);

  return (
    <div ref={rootRef} className="pointer-events-auto sm:hidden">
      <div className="relative z-20 flex items-center justify-end">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="public-mobile-nav-card"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={open ? closeMenu : openMenu}
          className={cn(
            "relative flex size-12 items-center justify-center rounded-full border-4 border-black text-black shadow-[5px_5px_0_0_#000] transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000]",
            open ? "bg-fab-amber" : "bg-white",
          )}
        >
          <Menu
            className={cn(
              "absolute size-7 transition-all duration-200",
              open
                ? "rotate-90 scale-75 opacity-0"
                : "rotate-0 scale-100 opacity-100",
            )}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <X
            className={cn(
              "absolute size-7 transition-all duration-200",
              open
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-75 opacity-0",
            )}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-10 sm:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          ref={overlayRef}
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMenu}
          tabIndex={open ? 0 : -1}
          className="absolute inset-0 bg-fab-teal/55 opacity-0 backdrop-blur-[2px]"
        />

        <div className="pointer-events-none absolute top-20 right-4 w-[calc(100vw-2rem)]">
          <div
            ref={cardRef}
            id="public-mobile-nav-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-mobile-nav-title"
            className={cn(
              "relative flex max-h-[calc(100svh-5rem)] origin-top-right flex-col overflow-hidden rounded-[2.35rem] border-4 border-black bg-background p-4 shadow-[12px_12px_0_0_#000] opacity-0",
              open ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <div className="relative flex flex-col gap-4 -mt-5">
              <div className="max-w-[15rem]"></div>

              <nav className="relative flex flex-col gap-3">
                {primaryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    tabIndex={open ? 0 : -1}
                    className={cn(mobileNavLinkClass, item.mobileClassName)}
                  >
                    <PublicNavItemContent label={item.label} />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
