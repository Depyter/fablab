import { ChatSelectThreadState } from "@/components/chat/chat-select-thread-state";
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

  return <ChatSelectThreadState />;
}
