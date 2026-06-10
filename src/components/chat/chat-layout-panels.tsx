import { cn } from "@/lib/utils";

interface ChatPaneProps {
  children: React.ReactNode;
  isInConversation: boolean;
}

export function ChatSidebarPane({ children, isInConversation }: ChatPaneProps) {
  return (
    <div
      className={cn(
        "shrink-0 h-full bg-[var(--fab-amber-light)] border-r-4 border-black",
        "md:w-[300px] md:block",
        isInConversation ? "hidden" : "w-full",
      )}
    >
      {children}
    </div>
  );
}

export function ChatContentPane({ children, isInConversation }: ChatPaneProps) {
  return (
    <div
      className={cn(
        "flex-1 h-full overflow-hidden min-w-0 bg-[var(--fab-bg-main)]",
        !isInConversation
          ? "hidden md:flex md:items-center md:justify-center"
          : "flex flex-col",
      )}
    >
      {children}
    </div>
  );
}
