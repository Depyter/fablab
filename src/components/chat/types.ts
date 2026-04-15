import { Id } from "@convex/_generated/dataModel";

export interface MessageFile {
  fileUrl: string;
  fileType: string | null;
  originalName: string | null;
}

export interface PendingAttachment {
  storageId: string;
  fileName: string;
  fileType: string;
  previewUrl: string;
}

export interface ChatInterfaceProps {
  roomId: Id<"rooms">;
  threadId?: Id<"threads">;
  currentUserName: string;
}
