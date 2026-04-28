import { ClientAuthBoundary } from "@/components/ClientAuthBoundary";
import { hasValidSession } from "@/lib/auth-queries";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
  return <ClientAuthBoundary>{children}</ClientAuthBoundary>;
}
