"use client";

import Link from "next/link";
import { Menu, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/about", label: "About", hoverColor: "hover:bg-fab-amber" },
  { href: "/services", label: "Services", hoverColor: "hover:bg-fab-magenta" },
  { href: "/login", label: "Login", hoverColor: "hover:bg-fab-teal" },
];

export function PublicMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="flex h-12 w-12 items-center justify-center border-4 border-black bg-white text-black transition-transform active:scale-95 sm:hidden"
          aria-label="Open navigation menu"
        >
          <Menu strokeWidth={4} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="top"
        className="h-full w-full border-b-8 border-black bg-background p-0"
      >
        {/* Heavy Grid Background */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_2px,transparent_2px),linear-gradient(to_bottom,var(--border)_2px,transparent_2px)] bg-[size:60px_60px] opacity-20" />

        <div className="relative z-10 flex h-full flex-col">
          <SheetHeader className="h-16 border-b-4 border-black bg-white px-6">
            <div className="flex h-full items-center justify-between">
              <SheetTitle className="text-2xl font-black uppercase tracking-tighter text-black">
                IskoLab
              </SheetTitle>
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center border-4 border-black bg-fab-magenta text-white"
              >
                <X
                  strokeWidth={4}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </button>
            </div>
          </SheetHeader>

          <nav className="flex flex-1 flex-col justify-center">
            <div className="border-b-4 border-black">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center justify-between border-b-4 border-black bg-white p-10 transition-colors last:border-b-0",
                    item.hoverColor,
                  )}
                >
                  <span className="text-3xl font-black uppercase tracking-tighter text-black leading-none">
                    {item.label}
                  </span>
                  <div className="flex items-center">
                    <ChevronRight
                      className="h-8 w-8 transition-transform duration-150 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2"
                      strokeWidth={6}
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                    />
                    <ChevronRight
                      className="h-8 w-8 -ml-5 transition-transform duration-150 delay-75 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2 opacity-60"
                      strokeWidth={6}
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
