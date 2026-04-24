import { ClientAuthBoundary } from "@/components/ClientAuthBoundary";
import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <ClientAuthBoundary>{children}</ClientAuthBoundary>;
}
