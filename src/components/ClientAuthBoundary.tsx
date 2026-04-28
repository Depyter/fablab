"use client";

import { PropsWithChildren, useRef } from "react";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import { useGSAP } from "@gsap/react";
import { Authenticated, AuthLoading, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import gsap from "gsap";
import { api } from "@/../convex/_generated/api";
import { BannedUserDialog } from "@/components/ban-error-dialog";
import { authClient } from "@/lib/auth-client";

gsap.registerPlugin(useGSAP);

const AUTH_PHRASES = [
  {
    key: "anything",
    accentClassName: "text-fab-magenta",
    text: "ALMOST ANYTHING.",
  },
  {
    key: "prints",
    accentClassName: "text-fab-teal",
    text: "3D PRINTS.",
  },
  {
    key: "dreams",
    accentClassName: "text-fab-purple",
    text: "DREAMS COME TRUE.",
  },
  {
    key: "cuts",
    accentClassName: "text-fab-amber",
    text: "LASER CUTS.",
  },
] as const;

const GRID_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-[size:120px_120px] opacity-35";

function isAuthError(error: unknown): boolean {
  return (
    error instanceof ConvexError &&
    typeof error.data === "string" &&
    error.data.toLowerCase().includes("unauthenticated")
  );
}

function AuthBannedUserDialog() {
  const user = useQuery(api.users.getUserProfile);

  if (!user?.banned) return null;

  return (
    <BannedUserDialog
      reason={user.banReason ?? undefined}
      expiresAt={user.banExpires ?? undefined}
      actionLabel="Sign Out"
    />
  );
}

function AuthenticatingScreen() {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = scopeRef.current;
        if (!root) return;

        const introBlocks =
          root.querySelectorAll<HTMLElement>("[data-auth-intro]");
        const phrases = Array.from(
          root.querySelectorAll<HTMLElement>("[data-auth-phrase]"),
        );
        const dots = root.querySelectorAll<HTMLElement>("[data-auth-dot]");

        if (!phrases.length) return;

        gsap.set(phrases.slice(1), {
          autoAlpha: 0,
          y: 36,
          scale: 0.98,
        });

        gsap.from(introBlocks, {
          y: 32,
          opacity: 0,
          rotation: () => gsap.utils.random(-3, 3),
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
        });

        const phraseTimeline = gsap.timeline({
          repeat: -1,
          repeatDelay: 0.15,
        });

        phrases.forEach((phrase, index) => {
          const nextPhrase = phrases[(index + 1) % phrases.length];

          phraseTimeline
            .to({}, { duration: 1.4 })
            .to(phrase, {
              y: -30,
              scale: 0.96,
              autoAlpha: 0,
              duration: 0.35,
              ease: "power2.in",
            })
            .fromTo(
              nextPhrase,
              {
                y: 30,
                scale: 1.02,
                autoAlpha: 0,
              },
              {
                y: 0,
                scale: 1,
                autoAlpha: 1,
                duration: 0.5,
                ease: "power3.out",
              },
            );
        });

        gsap.fromTo(
          dots,
          { y: 0 },
          {
            y: -8,
            duration: 0.45,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            stagger: 0.1,
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const root = scopeRef.current;
        if (!root) return;

        const phrases = Array.from(
          root.querySelectorAll<HTMLElement>("[data-auth-phrase]"),
        );

        gsap.set(phrases.slice(1), {
          autoAlpha: 0,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
        });

        gsap.set(root.querySelectorAll("[data-auth-intro], [data-auth-dot]"), {
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
        });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: scopeRef },
  );

  return (
    <div
      ref={scopeRef}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative min-h-screen overflow-hidden bg-background"
    >
      <div className={GRID_BACKGROUND_CLASS} />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full max-w-6xl text-center">
          <div className="flex flex-col items-center">
            <span className="block text-6xl leading-[0.82] font-black tracking-tighter text-black sm:text-8xl lg:text-[10rem]">
              MAKE
            </span>

            <div className="relative mt-2 flex min-h-[8rem] w-full items-center justify-center sm:min-h-[10rem] lg:min-h-[12rem]">
              {AUTH_PHRASES.map((phrase) => (
                <div
                  key={phrase.key}
                  data-auth-phrase
                  className={[
                    "absolute inset-0 flex items-center justify-center text-center",
                    phrase.key === AUTH_PHRASES[0].key
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block max-w-5xl text-4xl leading-[0.82] font-black tracking-tighter sm:text-6xl lg:text-[6.75rem]",
                      phrase.accentClassName,
                    ].join(" ")}
                  >
                    {phrase.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <p
              data-auth-intro
              className="text-sm font-black uppercase tracking-[0.32em] text-black sm:text-base"
            >
              Authenticating
            </p>

            <div data-auth-intro className="flex items-center gap-2">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  data-auth-dot
                  className={[
                    "block h-4 w-4 border-4 border-black",
                    dot === 0
                      ? "bg-fab-magenta"
                      : dot === 1
                        ? "bg-fab-teal"
                        : "bg-fab-purple",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ClientAuthBoundary({ children }: PropsWithChildren) {
  return (
    <AuthBoundary
      authClient={authClient}
      onUnauth={() => {
        window.location.replace("/login");
      }}
      getAuthUserFn={api.auth.getAuthUser}
      isAuthError={isAuthError}
    >
      <AuthLoading>
        <AuthenticatingScreen />
      </AuthLoading>
      <Authenticated>
        <AuthBannedUserDialog />
        {children}
      </Authenticated>
    </AuthBoundary>
  );
}
