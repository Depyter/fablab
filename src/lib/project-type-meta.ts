import { ProjectStatusType } from "@convex/constants";
import { formatLabDate } from "@/lib/lab-time";
import {
  getWorkflow,
  getStatusLabel as getWorkflowStatusLabel,
  isKnownType,
} from "./project-workflow";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface TimelineStepDef {
  /** Canonical status this step represents. */
  status: ProjectStatusType;
  /** Human-readable step title. */
  title: string;
  /**
   * Returns the "by" attribution shown under the step.
   * Closes over only the fields it needs — no coupling to full project shape.
   */
  getByLabel: (project: {
    client?: { name: string } | null;
    assignedMaker?: { name: string } | null;
    bookingStartTime?: number | null;
  }) => string;
}

export interface ProjectTypeConfig {
  /** Timeline steps in display order. Order is derived from this array. */
  timeline: TimelineStepDef[];
}

// ═══════════════════════════════════════════════════════════════════════
// Configurations
// ═══════════════════════════════════════════════════════════════════════

export const PROJECT_TYPE_CONFIG: Record<string, ProjectTypeConfig> = {
  WORKSHOP: {
    // Payment confirms the spot → session happens → complete.
    // "claimed" is omitted — for workshops, "completed" is the end.
    timeline: [
      {
        status: "pending",
        title: "Booking",
        getByLabel: (p) => p.client?.name ?? "Client",
      },
      {
        status: "approved",
        title: "Review",
        getByLabel: () => "FabLab Staff",
      },
      {
        status: "paid",
        title: "Payment",
        getByLabel: () => "Client",
      },
      {
        status: "completed",
        title: "Workshop",
        getByLabel: (p) =>
          p.bookingStartTime
            ? formatLabDate(p.bookingStartTime, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Completed",
      },
    ],
  },

  FABRICATION: {
    // Work is done → pay → client picks up.
    timeline: [
      {
        status: "pending",
        title: "Submission",
        getByLabel: (p) => p.client?.name ?? "Client",
      },
      {
        status: "approved",
        title: "Review",
        getByLabel: () => "FabLab Staff",
      },
      {
        status: "completed",
        title: "Fabrication",
        getByLabel: (p) => p.assignedMaker?.name ?? "Waiting",
      },
      {
        status: "paid",
        title: "Payment",
        getByLabel: () => "FabLab Staff",
      },
      {
        status: "claimed",
        title: "Claim",
        getByLabel: () => "Client",
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

/** Safe config access. Returns FABRICATION timeline for unknown types. */
export function getConfig(type: string): { timeline: TimelineStepDef[] } {
  if (isKnownType(type))
    return { timeline: PROJECT_TYPE_CONFIG[type].timeline };
  return { timeline: PROJECT_TYPE_CONFIG.FABRICATION.timeline };
}

/**
 * Returns the context-appropriate status display label.
 * Backward-compatible wrapper around project-workflow's getStatusLabel.
 * Falls back to FABRICATION workflow when no type is given.
 */
export function getStatusLabel(
  status: ProjectStatusType,
  type?: string | null,
): string {
  return getWorkflowStatusLabel(getWorkflow(type ?? "FABRICATION"), status);
}

// Re-export workflow helpers so consumers can import from @/lib/project-type-meta
export {
  getWorkflow,
  isKnownType,
  isValidTransition,
} from "./project-workflow";
export type { ProjectType, ProjectWorkflow } from "./project-workflow";
