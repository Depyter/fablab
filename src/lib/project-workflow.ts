import { ProjectStatusType, PROJECT_STATUS_LABELS } from "@convex/constants";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type ProjectType = "WORKSHOP" | "FABRICATION";

/**
 * Type-specific workflow definition for a project type.
 * This is the single source of truth for business rules.
 */
export interface ProjectWorkflow {
  type: ProjectType;

  /** Timeline steps in display order. */
  steps: readonly ProjectStatusType[];

  /** Status display label overrides (falls back to PROJECT_STATUS_LABELS). */
  statusLabels: Partial<Record<ProjectStatusType, string>>;

  /** Which statuses allow payment via markProjectPaid. */
  payableStatuses: readonly ProjectStatusType[];

  /**
   * Valid transitions: { fromStatus: [toStatus1, toStatus2, ...] }
   * These are type-specific — workshops can't reach "claimed" and
   * fabrication can't skip to "paid" from "approved".
   */
  transitions: Record<ProjectStatusType, readonly ProjectStatusType[]>;

  /** Whether pending → approved requires assigning a maker first. */
  approvalRequiresMaker: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// Workflow Definitions (single source of truth)
// ═══════════════════════════════════════════════════════════════════════

export const WORKSHOP_WORKFLOW: ProjectWorkflow = {
  type: "WORKSHOP",
  steps: ["pending", "approved", "paid", "completed"],
  statusLabels: {
    approved: "Confirmed",
    paid: "Paid",
    completed: "Attended",
  },
  payableStatuses: ["approved", "paid", "completed", "claimed"],
  transitions: {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["pending", "completed", "paid", "cancelled"],
    paid: ["completed"],
    completed: ["approved", "paid"],
    rejected: ["pending"],
    cancelled: ["pending"],
    claimed: [],
  },
  approvalRequiresMaker: false,
};

export const FABRICATION_WORKFLOW: ProjectWorkflow = {
  type: "FABRICATION",
  steps: ["pending", "approved", "completed", "paid", "claimed"],
  statusLabels: {
    approved: "Fabrication",
    completed: "Payment",
    paid: "Claim",
  },
  payableStatuses: ["completed", "paid", "claimed"],
  transitions: {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["pending", "completed", "cancelled"],
    completed: ["approved", "paid"],
    paid: ["completed", "claimed"],
    claimed: ["paid"],
    rejected: ["pending"],
    cancelled: ["pending"],
  },
  approvalRequiresMaker: true,
};

export const WORKFLOWS: Record<ProjectType, ProjectWorkflow> = {
  WORKSHOP: WORKSHOP_WORKFLOW,
  FABRICATION: FABRICATION_WORKFLOW,
};

// ═══════════════════════════════════════════════════════════════════════
// Query Helpers
// ═══════════════════════════════════════════════════════════════════════

/** Type guard — ensures a string is a known project type. */
export function isKnownType(type: string): type is ProjectType {
  return type === "WORKSHOP" || type === "FABRICATION";
}

/** Safe workflow access. Falls back to FABRICATION for unknown types. */
export function getWorkflow(type: string): ProjectWorkflow {
  if (isKnownType(type)) return WORKFLOWS[type as ProjectType];
  return WORKFLOWS.FABRICATION;
}

/**
 * Returns the context-appropriate display label for a status
 * within the given workflow.
 */
export function getStatusLabel(
  workflow: ProjectWorkflow,
  status: ProjectStatusType,
): string {
  return workflow.statusLabels[status] ?? PROJECT_STATUS_LABELS[status];
}

/** Returns whether a transition is valid for the given workflow. */
export function isValidTransition(
  workflow: ProjectWorkflow,
  from: ProjectStatusType,
  to: ProjectStatusType,
): boolean {
  return workflow.transitions[from]?.includes(to) ?? false;
}
