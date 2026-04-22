import Image from "next/image";
import Link from "next/link";
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
      <header className="sticky top-0 z-20 h-[8vh] border-2 border-black bg-background">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex min-w-0 items-center">
            <Image
              src="/fablab-dark.svg"
              alt="Fablab Logo"
              width={120}
              height={120}
              className="h-8 w-auto"
            />
            <span className="ml-2 truncate text-sm font-bold tracking-[0.3em] text-black">
              IskoLab
            </span>
          </Link>

          <div className="sm:hidden">
            <PublicMobileNav />
          </div>

          <nav className="hidden items-center gap-4 md:gap-2 sm:flex">
            <Link
              href="/about"
              className="border-2 border-black px-3 py-1 text-sm font-medium text-black hover:bg-primary/20"
            >
              About Us
            </Link>

            <Link
              href="/services"
              className="border-2 border-black px-3 py-1 text-sm font-medium text-black hover:bg-primary/20"
            >
              Services
            </Link>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="border-2 border-black bg-primary px-3 py-1 text-sm font-medium text-white hover:bg-primary/80"
              >
                My Projects
              </Link>
            ) : (
              <Link
                href="/login"
                className="border-2 border-black px-3 py-1 text-sm font-medium text-black hover:bg-primary/20"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
