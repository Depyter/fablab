import type { ReactNode } from "react";
import { DataViewLayout } from "@/components/manage/data-view-layout";

export default function DashboardDataViewLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DataViewLayout>{children}</DataViewLayout>;
}
