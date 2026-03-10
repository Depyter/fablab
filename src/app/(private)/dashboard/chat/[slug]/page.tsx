"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const roomId = slug as Id<"rooms">;

  const currentUser = useQuery(api.auth.getCurrentUser);
  const room = useQuery(api.chat.query.getRoom, { roomId });

  if (!currentUser?.name) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mobile-only header with back button and room name */}
      <div className="md:hidden flex items-center gap-2 px-2 py-2 border-b bg-background shrink-0">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/chat">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          {room?.color && (
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: room.color }}
            />
          )}
          <span className="font-medium truncate">
            {room?.name ?? "Loading..."}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChatInterface roomId={roomId} currentUserName={currentUser.name} />
      </div>
    </div>
  );
}
