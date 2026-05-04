import Image from "next/image";
import Link from "next/link";
import { PublicMobileNavCard } from "@/components/public-mobile-nav-card";
import { PublicNavAuth } from "@/components/public-nav-auth";
import { PublicNavItemContent } from "@/components/public-nav-item-content";

const publicNavItems = [
  {
    href: "/#about",
    label: "About",
    desktopClassName: "hover:text-fab-magenta",
    mobileClassName: "hover:bg-fab-amber",
  },
  {
    href: "/services",
    label: "Services",
    desktopClassName: "hover:text-fab-teal",
    mobileClassName: "hover:bg-fab-magenta hover:text-white",
  },
] as const;

const desktopNavLinkClass =
  "group inline-flex items-center gap-2 text-xl font-black uppercase tracking-tighter text-black transition-colors";

export function PublicNavbar() {
  return (
    <header className="fixed top-0 left-0 z-[200] h-20 w-full sm:sticky sm:h-16 sm:border-b sm:border-black sm:bg-background sm:shadow-none sm:backdrop-blur-none">
      <div className="mx-auto flex h-full max-w-full items-center justify-between px-4 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="pointer-events-auto inline-flex rounded-full border-4 border-black bg-background px-4 py-2 shadow-[5px_5px_0_0_#000] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0_0_#000] sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-4xl sm:shadow-none sm:hover:translate-x-0 sm:hover:translate-y-0 sm:hover:shadow-none"
        >
          <Image
            src="/logo_1.png"
            alt="FabLab Logo"
            width={125}
            height={43}
            priority
            className="h-8 w-auto sm:h-12"
          />
        </Link>

        <PublicMobileNavCard items={publicNavItems} />

        <nav className="hidden items-center gap-8 sm:flex">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${desktopNavLinkClass} ${item.desktopClassName}`}
            >
              <PublicNavItemContent label={item.label} />
            </Link>
          ))}

          <PublicNavAuth
            dashboardClassName="inline-flex items-center bg-fab-magenta px-6 py-2 text-xl font-black uppercase tracking-tighter text-white transition-all hover:bg-fab-amber"
            loginClassName="inline-flex items-center bg-fab-teal px-6 py-2 text-xl font-black uppercase tracking-tighter text-white transition-all hover:bg-fab-amber"
            loadingClassName="h-10 w-24 bg-gray-200"
          />
        </nav>
      </div>
    </header>
  );
}
