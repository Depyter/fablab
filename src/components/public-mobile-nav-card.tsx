"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

export function PublicMobileNavCard({ items }: PublicMobileNavCardProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryItems = [
    ...items,
    {
      href: "/dashboard",
      label: "Dashboard",
      mobileClassName:
        "bg-fab-magenta text-white hover:bg-fab-amber hover:text-black",
    },
  ] as const;

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setMounted(true);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

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

  return (
    <div className="pointer-events-auto sm:hidden">
      <div className="relative z-[210] flex items-center justify-end">
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

      {mounted ? (
        <div
          className={cn(
            "fixed inset-0 z-[190] sm:hidden",
            open ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!open}
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className={cn(
              "absolute inset-0 bg-fab-teal/55 backdrop-blur-[2px] transition-opacity duration-200",
              open ? "opacity-100" : "opacity-0",
            )}
          />

          <div className="pointer-events-none absolute top-20 right-4 w-[calc(100vw-2rem)]">
            <div
              id="public-mobile-nav-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="public-mobile-nav-title"
              className={cn(
                "pointer-events-auto relative flex max-h-[calc(100svh-5rem)] origin-top-right flex-col overflow-hidden rounded-[2.35rem] border-4 border-black bg-background p-4 shadow-[12px_12px_0_0_#000] transition-all duration-200 ease-out",
                open
                  ? "translate-x-0 translate-y-0 rotate-[-2deg] scale-100 opacity-100"
                  : "translate-x-7 -translate-y-4 rotate-[12deg] scale-95 opacity-0",
              )}
            >
              <div className="relative flex flex-col gap-4 -mt-5">
                <div
                  className={cn(
                    "max-w-[15rem] transition-all duration-200",
                    open
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0",
                  )}
                ></div>

                <nav className="relative flex flex-col gap-3">
                  {primaryItems.map((item, index) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      style={{
                        transitionDelay: open ? `${80 + index * 45}ms` : "0ms",
                      }}
                      className={cn(
                        mobileNavLinkClass,
                        "transition-all duration-200",
                        open
                          ? "translate-y-0 opacity-100"
                          : "translate-y-3 opacity-0",
                        item.mobileClassName,
                      )}
                    >
                      <PublicNavItemContent label={item.label} />
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
