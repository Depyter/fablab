import { hasValidSession } from "@/lib/auth-queries";
import { ClientAuthBoundary } from "@/components/ClientAuthBoundary";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isAuthenticated = await hasValidSession();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <ClientAuthBoundary>{children}</ClientAuthBoundary>;
}
