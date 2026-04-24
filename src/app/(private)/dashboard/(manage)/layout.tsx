import { getUserProfile } from "@/lib/auth-queries";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function ManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getUserProfile();

  if (!profile || profile.role === "client") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col h-full bg-background w-full min-w-0">
      {children}
    </div>
  );
}
