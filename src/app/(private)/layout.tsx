import { ClientAuthBoundary } from "@/components/ClientAuthBoundary";
import { ReactNode } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ClientAuthBoundary>{children}</ClientAuthBoundary>;
}
