import type { Id } from "@convex/_generated/dataModel";
import { ChatThreadClient } from "./_client";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ slug: string; threadId: string }>;
}) {
  const { slug, threadId } = await params;
  const roomId = slug as Id<"rooms">;
  const activeThreadId = threadId as Id<"threads">;

  return (
    <ChatThreadClient
      roomId={roomId}
      threadId={activeThreadId}
    />
  );
}
