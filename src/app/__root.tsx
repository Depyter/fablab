import appCss from "./globals.css?url";
import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { CtaButton } from "@/components/cta-button";
import { useRouteContext } from "@tanstack/react-router";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { QueryClient } from "@tanstack/react-query";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";
import { createServerFn } from "@tanstack/react-start";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
  isAuthenticated?: boolean;
  token?: string | null;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IskoLab | Fablab UP Cebu" },
      { name: "description", content: "Make almost Everything!" },
    ],
    links: [
      // Replaces next/font/google
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap",
      },
      // Globals CSS
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/fablab.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/ios/16.png", sizes: "16x16", type: "image/png" },
      { rel: "icon", href: "/ios/32.png", sizes: "32x32", type: "image/png" },
      { rel: "apple-touch-icon", href: "/ios/180.png", sizes: "180x180" },
      { rel: "apple-touch-icon", href: "/ios/167.png", sizes: "167x167" },
      { rel: "apple-touch-icon", href: "/ios/152.png", sizes: "152x152" },
      { rel: "apple-touch-icon", href: "/ios/144.png", sizes: "144x144" },
      { rel: "apple-touch-icon", href: "/ios/120.png", sizes: "120x120" },
      { rel: "apple-touch-icon", href: "/ios/114.png", sizes: "114x114" },
    ],
  }),
  beforeLoad: async (ctx) => {
    const token = await getAuth();

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },

  notFoundComponent: () => {
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center p-12">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-[size:120px_120px] opacity-35" />
      <h1 className="relative z-10 text-6xl font-black uppercase tracking-tighter sm:text-8xl">
        404 - Page Not Found
      </h1>
      <p className="relative z-10 mt-6 text-2xl font-bold uppercase tracking-tighter">
        The page you&#39;re looking for doesn&#39;t exist.
      </p>
      <CtaButton
        href="/"
        label="Home"
        className="h-8 mt-8 shrink-0 p-5 sm:p-7 lg:p-9"
      />
    </div>;
  },
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full">
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
