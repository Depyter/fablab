import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth-queries";

export default async function ManageDataViewLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getUserProfile();

  if (!profile || profile.role === "client") {
    redirect("/dashboard");
  }

  return children;
}
