"use client";

import { Button } from "@/components/ui/button";
import {
  CheckCheck,
  CreditCard,
  XCircle,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProjectStatusType } from "@convex/constants";
import { getStatusLabel } from "@/lib/project-type-meta";

interface WorkshopQuickActionsProps {
  projectId: string;
  projectStatus: ProjectStatusType;
  projectType: string;
  roomId: string | null;
  threadId: string | null;
  clientName: string;
  onUpdateStatus: (status: ProjectStatusType) => void;
  onMarkPaid: () => void;
  isClient: boolean;
}

/**
 * A row of quick-action buttons for managing a workshop registration.
 * Shown prominently at the top of the workshop project-details layout.
 */
export function WorkshopQuickActions({
  projectStatus,
  projectType,
  roomId,
  threadId,
  onUpdateStatus,
  onMarkPaid,
  isClient,
}: WorkshopQuickActionsProps) {
  if (isClient) return null;

  const canCheckIn = projectStatus === "approved" || projectStatus === "paid";
  const canMarkPaid = projectStatus === "approved";
  const canCancel =
    projectStatus === "pending" ||
    projectStatus === "approved" ||
    projectStatus === "paid";

  return (
    <div
      className="rounded-xl border p-3 sm:p-4"
      style={{
        borderColor: "var(--fab-border-md)",
        background: "var(--fab-bg-sidebar)",
      }}
    >
      <p
        className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--fab-text-dim)" }}
      >
        Quick Actions
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {/* Check In — completes the registration */}
        <Button
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-3 text-xs font-semibold",
            canCheckIn
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-40",
          )}
          style={
            canCheckIn
              ? {
                  background: "var(--fab-teal)",
                  color: "white",
                  border: "none",
                }
              : undefined
          }
          disabled={!canCheckIn}
          onClick={() => onUpdateStatus("completed")}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          {projectStatus === "completed" ? "Checked In" : "Check In"}
        </Button>

        {/* Collect Payment */}
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 px-3 text-xs font-semibold",
            !canMarkPaid && "cursor-not-allowed opacity-40",
          )}
          disabled={!canMarkPaid}
          onClick={onMarkPaid}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Collect Payment
        </Button>

        {/* Cancel */}
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 px-3 text-xs font-semibold text-red-600 hover:text-red-700",
            !canCancel && "cursor-not-allowed opacity-40",
          )}
          disabled={!canCancel}
          onClick={() => onUpdateStatus("cancelled")}
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancel
        </Button>

        {/* Message */}
        {roomId && threadId ? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5 px-3 text-xs font-semibold" asChild>
            <Link href={`/dashboard/chat/${roomId}/${threadId}`}>
              <MessageSquare className="h-3.5 w-3.5" />
              Message
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs font-semibold"
            disabled
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </Button>
        )}

        {/* Current status pill */}
        <span className="ml-auto shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] shadow-sm">
          {getStatusLabel(projectStatus, projectType)}
        </span>
      </div>
    </div>
  );
}
