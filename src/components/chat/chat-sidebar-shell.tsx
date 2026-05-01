import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function ChatSidebarShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden", className)}
      style={{
        background:
          "linear-gradient(180deg, var(--fab-bg-sidebar) 0%, rgba(250,249,255,0.8) 100%)",
      }}
    >
      <div
        className="flex h-14 shrink-0 items-center gap-2 px-3"
        style={{ borderBottom: "1px solid var(--fab-border-md)" }}
      >
        <SidebarTrigger className="text-(--fab-text-dim) hover:text-(--fab-text-primary) transition-colors" />
        <div className="flex flex-1 items-center gap-2">
          <span
            className="text-[12px] font-black uppercase tracking-[0.15em]"
            style={{
              color: "var(--fab-text-primary)",
              fontFamily: "var(--font-body)",
            }}
          >
            Messaging
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">{children}</div>
    </div>
  );
}
