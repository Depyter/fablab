import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }
  return (
    <ConvexClientProvider expectAuth={true}>{children}</ConvexClientProvider>
  );
}
