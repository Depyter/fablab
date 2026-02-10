"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
          <div className="relative">
            <MessageCircle className="h-24 w-24 text-muted-foreground/40" />
            <Sparkles className="h-8 w-8 text-primary absolute -top-2 -right-2 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              No Chat Selected
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Pick a conversation from the sidebar to start chatting, or create
              a new room to break the ice! 💬
            </p>
          </div>

          <div className="pt-4 text-xs text-muted-foreground/60 italic">
            &ldquo;Even the best conversations start with a single
            message&rdquo;
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
