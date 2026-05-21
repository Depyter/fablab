import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function ChatSidebarShell({
  className,
  children,
  headerEnd,
}: {
  className?: string;
  children: ReactNode;
  headerEnd?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-[var(--fab-amber-light)]",
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-3 border-b-2 border-black bg-white">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="rounded-none border-2 border-black bg-white" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--fab-text-primary)]">
            Messaging
          </span>
          {headerEnd}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">{children}</div>
    </div>
  );
}
