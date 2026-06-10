import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatThreadLoading } from "@/components/chat/chat-loading";
import { useChatThreadTitle } from "@/components/chat/chat-rooms-context";
import { useProfile } from "@/components/sidebar/profile-context";

export const Route = createFileRoute(
  "/_private/dashboard/chat/$roomId/$threadId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { roomId, threadId } = useParams({
    from: "/_private/dashboard/chat/$roomId/$threadId",
  });
  const { profile, isPending } = useProfile();
  const threadTitle = useChatThreadTitle(
    roomId as Id<"rooms">,
    threadId as Id<"threads">,
  );

  if (isPending) {
    return <ChatThreadLoading />;
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex-1 min-h-0 bg-background">
          <ChatInterface
            roomId={roomId as Id<"rooms">}
            threadId={threadId as Id<"threads">}
            threadTitle={threadTitle}
            currentUserName={profile?.name ?? ""}
            showBackButton={true}
          />
        </div>
      </div>
    </div>
  );
}
