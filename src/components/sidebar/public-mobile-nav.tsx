"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/login", label: "Login" },
];

export function PublicMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden text-white hover:bg-white/10 hover:text-white"
          aria-label="Open navigation menu"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="top"
        className="w-full border-white/10 bg-primary text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-white">IskoLab</SheetTitle>
        </SheetHeader>

        <nav className="mt-6 ml-2 flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                "hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}