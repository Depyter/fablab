import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { PublicMobileNav } from "@/components/sidebar/public-mobile-nav";
import { hasValidSession } from "@/lib/auth-queries";


export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isAuthenticated = await hasValidSession();

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 h-[8vh] bg-primary border-b border-sidebar-border/10">
        <div className="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center min-w-0">
            <Image
              src="/fablab.svg"
              alt="Fablab Logo"
              width={120}
              height={120}
              className="h-8 w-auto"
            />
            <span className="ml-2 text-sm font-bold text-white tracking-[0.3em] truncate">
              IskoLab
            </span>
          </Link>

          <div className="sm:hidden">
            <PublicMobileNav />
          </div>

          <nav className="hidden sm:flex items-center gap-4 md:gap-6 text-white">
            <Link href="/about" className="text-sm font-medium">
              About Us
            </Link>

            <Link href="/services" className="text-sm font-medium">
              Services
            </Link>

            {isAuthenticated ? (
              <Link href="/dashboard" className="text-sm font-medium">
                My Projects
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
