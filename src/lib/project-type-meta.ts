import { ProjectStatusType, PROJECT_STATUS_LABELS } from "@convex/constants";
import { formatLabDate } from "@/lib/lab-time";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type ProjectType = "WORKSHOP" | "FABRICATION";

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

  /** Overrides for PROJECT_STATUS_LABELS. Falls back to shared labels. */
  statusLabels: Partial<Record<ProjectStatusType, string>>;

  /** Which canonical statuses allow payment via markProjectPaid. */
  payableStatuses: ProjectStatusType[];

  /** Whether pending → approved requires assigning a maker first. */
  approvalRequiresMaker: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// Configurations
// ═══════════════════════════════════════════════════════════════════════

export const PROJECT_TYPE_CONFIG: Record<ProjectType, ProjectTypeConfig> = {
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
            : "Scheduled",
      },
    ],

    statusLabels: {
      approved: "Confirmed",
      paid: "Paid",
      completed: "Attended",
    },

    // Workshop attendees pay to confirm their spot (before the session).
    // "completed" and "claimed" are also allowed so payment details
    // can be updated when moving backward in the workflow.
    payableStatuses: ["approved", "paid", "completed", "claimed"],

    approvalRequiresMaker: false,
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

    statusLabels: {
      approved: "Fabrication",
      completed: "Payment",
      paid: "Claim",
    },

    // Fabrication projects pay after the work is done.
    // "claimed" is also allowed so payment details can be updated later.
    payableStatuses: ["completed", "paid", "claimed"],

    approvalRequiresMaker: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

/** Type guard — ensures a string is a known project type. */
export function isKnownType(type: string): type is ProjectType {
  return type === "WORKSHOP" || type === "FABRICATION";
}

/** Safe config access. Returns FABRICATION config for unknown types. */
export function getConfig(type: string): ProjectTypeConfig {
  if (isKnownType(type)) return PROJECT_TYPE_CONFIG[type];
  return PROJECT_TYPE_CONFIG.FABRICATION;
}

/**
 * Returns the context-appropriate status display label.
 * Falls back to the shared PROJECT_STATUS_LABELS when no type-specific
 * override exists, or when the type is unknown.
 */
export function getStatusLabel(
  status: ProjectStatusType,
  type?: string | null,
): string {
  if (type && isKnownType(type)) {
    return (
      PROJECT_TYPE_CONFIG[type].statusLabels[status] ??
      PROJECT_STATUS_LABELS[status]
    );
  }
  return PROJECT_STATUS_LABELS[status];
}
