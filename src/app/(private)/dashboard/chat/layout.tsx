import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
      className="h-full"
    >
      <ChatSidebar />
      <SidebarInset className="h-full overflow-hidden">{children}</SidebarInset>
    </SidebarProvider>
  );
}
