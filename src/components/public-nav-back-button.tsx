"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const BACK_ROUTES = [
  { pattern: /^\/services\/.+/, href: "/services", label: "Services" },
] as const;

export function PublicNavBackButton() {
  const pathname = usePathname();
  const match = BACK_ROUTES.find((r) => r.pattern.test(pathname));

  if (!match) return null;

  return (
    <Link
      href={match.href}
      className="group pointer-events-auto inline-flex items-center gap-2 rounded-full border-4 border-black bg-background px-4 h-12 text-md font-black uppercase tracking-tight shadow-[5px_5px_0_0_#000] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0_0_#000] cursor-pointer sm:h-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-xl sm:tracking-tighter sm:shadow-none sm:hover:translate-x-0 sm:hover:translate-y-0 sm:hover:shadow-none sm:hover:text-fab-magenta"
    >
      <ChevronLeft
        className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 sm:group-hover:-translate-x-1"
        strokeWidth={5}
      />
      {match.label}
    </Link>
  );
}
