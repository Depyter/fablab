"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export function PublicNavAuth() {
  return (
    <>
      <AuthLoading>
        <div className="h-10 w-24 animate-pulse bg-gray-200" />
      </AuthLoading>
      <Authenticated>
        <Link
          href="/dashboard"
          className="bg-fab-magenta px-6 py-2 text-xl font-black uppercase tracking-tighter text-white transition-all hover:bg-fab-amber"
        >
          Dashboard
        </Link>
      </Authenticated>
      <Unauthenticated>
        <Link
          href="/login"
          className="bg-fab-teal px-6 py-2 text-xl font-black uppercase tracking-tighter text-white transition-all hover:bg-fab-amber"
        >
          Login
        </Link>
      </Unauthenticated>
    </>
  );
}
