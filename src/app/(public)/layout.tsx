import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ReactNode } from "react";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
