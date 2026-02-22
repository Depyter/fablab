"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const roomId = slug as Id<"rooms">;

  // Get current user info
  const currentUser = useQuery(api.auth.getCurrentUser);

  if (!currentUser?.name) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChatInterface roomId={roomId} currentUserName={currentUser.name} />
    </div>
  );
}
