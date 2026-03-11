import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/../convex/_generated/api";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function ManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await fetchAuthQuery(api.users.getUserProfile, {});

  if (!profile || profile.role === "client") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
