import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { PublicMobileNav } from "@/components/sidebar/public-mobile-nav";
import { PublicNavAuth } from "@/components/public-nav-auth";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 h-16 border-b-4 border-black bg-background">
        <div className="mx-auto flex h-full max-w-full items-center justify-between px-6 sm:px-10 lg:px-16">
          <Link
            href="/"
            className="text-3xl font-black uppercase tracking-tighter text-black transition-colors hover:text-fab-magenta sm:text-4xl"
          >
            <Image
              src="/logo_1.png"
              alt="FabLab Logo"
              width={125}
              height={125}
            />
          </Link>

          <div className="sm:hidden">
            <PublicMobileNav />
          </div>

          <nav className="hidden items-center gap-8 sm:flex">
            <Link
              href="/about"
              className="text-xl font-black uppercase tracking-tighter text-black hover:text-fab-magenta"
            >
              About
            </Link>

            <Link
              href="/services"
              className="text-xl font-black uppercase tracking-tighter text-black hover:text-fab-teal"
            >
              Services
            </Link>

            <PublicNavAuth />
          </nav>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
      <footer className="relative z-10 bg-background py-16 text-center sm:py-24 border-black">
        <p className="text-xl font-black uppercase tracking-tighter text-black sm:text-3xl">
          FabLab UP Cebu • Cebu City • © 2026
        </p>
      </footer>
    </div>
  );
}
