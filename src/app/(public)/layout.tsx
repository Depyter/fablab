import { ConvexClientProvider } from "@/components/ConvexClientProvider";
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
    <ConvexClientProvider>
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 h-[8vh] bg-background border-2 border-black">
          <div className="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
            <div className="flex items-center justify-start gap-2">
              <Link href="/" className="flex items-center min-w-0">
                <Image
                  src="/fablab-dark.svg"
                  alt="Fablab Logo"
                  width={120}
                  height={120}
                  className="h-8 w-auto"
                />
                <span className="ml-2 text-sm font-bold text-black tracking-[0.3em] truncate">
                  IskoLab
                </span>
              </Link>
            </div>

            <div className="sm:hidden">
              <PublicMobileNav />
            </div>

            <nav className="hidden sm:flex items-center md:gap-2 gap-4  ">
              <Link href="/about" className="text-sm font-medium border-2 text-black border-black px-3 py-1 hover:bg-primary/20">
                About Us
              </Link>

              <Link href="/services" className="text-sm font-medium border-2 text-black border-black px-3 py-1 hover:bg-primary/20">
                Services
              </Link>

              {isAuthenticated ? (
                <Link href="/dashboard" className="text-sm font-medium border-2 text-white border-black px-3 py-1 bg-primary hover:bg-primary/80">
                  My Projects
                </Link>
              ) : (
                <Link href="/login" className="text-sm font-medium border-2 text-white border-black px-3 py-1 hover:bg-primary">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </ConvexClientProvider>
  );
}
