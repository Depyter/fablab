import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getVerifiedSessionToken } from "@/lib/auth-queries";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getVerifiedSessionToken();
  if (!token) {
    redirect("/login");
  }
  return (
    <ConvexClientProvider initialToken={token} expectAuth={true}>
      {children}
    </ConvexClientProvider>
  );
}
