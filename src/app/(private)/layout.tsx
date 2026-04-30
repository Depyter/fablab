import { ClientAuthBoundary } from "@/components/ClientAuthBoundary";
import { ReactNode } from "react";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getToken();
  return (
    <ConvexClientProvider initialToken={token}>
      <ClientAuthBoundary>{children}</ClientAuthBoundary>
    </ConvexClientProvider>
  );
}
