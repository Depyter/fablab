import type { ReactNode } from "react";

export function DataViewShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
