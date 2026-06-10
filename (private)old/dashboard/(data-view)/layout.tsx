import type { ReactNode } from "react";
import { DataViewShell } from "@/components/manage/data-view-shell";

export default function DashboardDataViewShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DataViewShell>{children}</DataViewShell>;
}
