import { redirect } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { slug } = await params;
  const roomId = slug as Id<"rooms">;
  const { thread } = await searchParams;

  if (thread) {
    redirect(`/dashboard/chat/${roomId}/${thread}`);
  }

  return (
    <div className="flex h-full overflow-hidden min-h-0 relative">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex-1 min-h-0 bg-background">
          <div
            className="relative flex h-full flex-col items-center justify-center overflow-hidden p-8 text-center"
            style={{ background: "var(--fab-bg-main)" }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(var(--fab-grid) 1px, transparent 1px),
                  linear-gradient(90deg, var(--fab-grid) 1px, transparent 1px)
                `,
                backgroundSize: "28px 28px",
              }}
            />
            <div
              className="relative flex max-w-md flex-col items-center rounded-[28px] px-8 py-10"
              style={{
                background: "var(--fab-chat-empty-card)",
                border: "1px solid var(--fab-border-md)",
                boxShadow: `0 20px 60px var(--fab-chat-empty-glow)`,
              }}
            >
              <p
                className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]"
                style={{
                  color: "var(--fab-amber)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Select a conversation
              </p>
              <h3
                className="mb-3 font-mono text-2xl font-semibold"
                style={{ color: "var(--fab-text-primary)" }}
              >
                No thread selected
              </h3>
              <p
                className="max-w-sm text-sm leading-6"
                style={{
                  color: "var(--fab-text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Pick a thread from the sidebar to read updates, reply to your
                team, or jump back into the conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
