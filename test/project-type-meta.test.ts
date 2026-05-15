import { describe, expect, test } from "vitest";
import {
  getConfig,
  getStatusLabel,
  getWorkflow,
  isKnownType,
  PROJECT_TYPE_CONFIG,
  type ProjectType,
} from "../src/lib/project-type-meta";

// ═════════════════════════════════════════════════════════════════════════════
// Project type guard
// ═════════════════════════════════════════════════════════════════════════════

describe("isKnownType", () => {
  test("returns true for WORKSHOP", () => {
    expect(isKnownType("WORKSHOP")).toBe(true);
  });

  test("returns true for FABRICATION", () => {
    expect(isKnownType("FABRICATION")).toBe(true);
  });

  test("returns false for empty string", () => {
    expect(isKnownType("")).toBe(false);
  });

  test("returns false for unknown type", () => {
    expect(isKnownType("RENTALS")).toBe(false);
  });

  test("returns false for undefined-like values", () => {
    expect(isKnownType("undefined")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Config access
// ═════════════════════════════════════════════════════════════════════════════

describe("getConfig", () => {
  test("returns workshop timeline for WORKSHOP", () => {
    const config = getConfig("WORKSHOP");
    expect(config.timeline).toHaveLength(4);
    expect(config.timeline.map((s) => s.status)).toEqual([
      "pending",
      "approved",
      "paid",
      "completed",
    ]);
  });

  test("returns fabrication timeline for FABRICATION", () => {
    const config = getConfig("FABRICATION");
    expect(config.timeline).toHaveLength(5);
    expect(config.timeline.map((s) => s.status)).toEqual([
      "pending",
      "approved",
      "completed",
      "paid",
      "claimed",
    ]);
  });

  test("returns fabrication timeline for unknown types (safe default)", () => {
    const config = getConfig("RENTALS");
    expect(config.timeline).toEqual(PROJECT_TYPE_CONFIG.FABRICATION.timeline);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Status label overrides
// ═════════════════════════════════════════════════════════════════════════════

describe("getStatusLabel", () => {
  test("workshop overrides approved -> 'Confirmed'", () => {
    expect(getStatusLabel("approved", "WORKSHOP")).toBe("Confirmed");
  });

  test("workshop overrides paid -> 'Paid'", () => {
    expect(getStatusLabel("paid", "WORKSHOP")).toBe("Paid");
  });

  test("workshop overrides completed -> 'Attended'", () => {
    expect(getStatusLabel("completed", "WORKSHOP")).toBe("Attended");
  });

  test("fabrication overrides approved -> 'Fabrication'", () => {
    expect(getStatusLabel("approved", "FABRICATION")).toBe("Fabrication");
  });

  test("fabrication overrides completed -> 'Payment'", () => {
    expect(getStatusLabel("completed", "FABRICATION")).toBe("Payment");
  });

  test("fabrication overrides paid -> 'Claim'", () => {
    expect(getStatusLabel("paid", "FABRICATION")).toBe("Claim");
  });

  test("pending falls back to shared 'Review' for both types", () => {
    expect(getStatusLabel("pending", "WORKSHOP")).toBe("Review");
    expect(getStatusLabel("pending", "FABRICATION")).toBe("Review");
  });

  test("claimed falls back to shared 'Claimed'", () => {
    expect(getStatusLabel("claimed", "WORKSHOP")).toBe("Claimed");
    expect(getStatusLabel("claimed", "FABRICATION")).toBe("Claimed");
  });

  test("rejected / cancelled fall back to shared labels", () => {
    expect(getStatusLabel("rejected", "WORKSHOP")).toBe("Rejected");
    expect(getStatusLabel("cancelled", "FABRICATION")).toBe("Cancelled");
  });

  test("returns shared label when type is unknown / null / undefined", () => {
    expect(getStatusLabel("approved", "RENTALS")).toBe("Fabrication");
    expect(getStatusLabel("approved", null)).toBe("Fabrication");
    expect(getStatusLabel("approved", undefined)).toBe("Fabrication");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Timeline structure
// ═════════════════════════════════════════════════════════════════════════════

describe("timeline structure", () => {
  test("workshop has 4 timeline steps", () => {
    expect(getConfig("WORKSHOP").timeline).toHaveLength(4);
  });

  test("fabrication has 5 timeline steps", () => {
    expect(getConfig("FABRICATION").timeline).toHaveLength(5);
  });

  test("workshop timeline order is pending -> approved -> paid -> completed", () => {
    const order = getConfig("WORKSHOP").timeline.map((s) => s.status);
    expect(order).toEqual(["pending", "approved", "paid", "completed"]);
  });

  test("workshop timeline omits 'claimed'", () => {
    const statuses = getConfig("WORKSHOP").timeline.map((s) => s.status);
    expect(statuses).not.toContain("claimed");
  });

  test("fabrication timeline order is pending -> approved -> completed -> paid -> claimed", () => {
    const order = getConfig("FABRICATION").timeline.map((s) => s.status);
    expect(order).toEqual([
      "pending",
      "approved",
      "completed",
      "paid",
      "claimed",
    ]);
  });

  test("timeline step titles match config per type", () => {
    expect(getConfig("WORKSHOP").timeline.map((s) => s.title)).toEqual([
      "Booking",
      "Review",
      "Payment",
      "Workshop",
    ]);
    expect(getConfig("FABRICATION").timeline.map((s) => s.title)).toEqual([
      "Submission",
      "Review",
      "Fabrication",
      "Payment",
      "Claim",
    ]);
  });

  // ── Step attribution ───────────────────────────────────────────────────────
  const project = {
    client: { name: "Alice" },
    assignedMaker: { name: "Charlie" },
    bookingStartTime: 1_700_000_000_000,
  };

  test("workshop step 0 shows client name", () => {
    expect(getConfig("WORKSHOP").timeline[0].getByLabel(project)).toBe("Alice");
  });

  test("workshop step 3 shows date when booking exists", () => {
    const label = getConfig("WORKSHOP").timeline[3].getByLabel(project);
    expect(label).toMatch(/[A-Z][a-z]{2}/);
  });

  test("workshop step 3 shows 'Completed' when no booking time", () => {
    expect(
      getConfig("WORKSHOP").timeline[3].getByLabel({
        ...project,
        bookingStartTime: null,
      }),
    ).toBe("Completed");
  });

  test("fabrication step 2 shows maker name / 'Waiting'", () => {
    expect(getConfig("FABRICATION").timeline[2].getByLabel(project)).toBe(
      "Charlie",
    );
    expect(
      getConfig("FABRICATION").timeline[2].getByLabel({
        ...project,
        assignedMaker: null,
      }),
    ).toBe("Waiting");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Timeline phase mapping (mirrors project-details.tsx logic)
// ═════════════════════════════════════════════════════════════════════════════

/** Replicates the timeline generation logic from project-details.tsx.
 *  Given a status and type, returns each step's display label. */
function resolveTimelinePhases(
  status: string,
  type: ProjectType,
): Array<{ title: string; statusLabel: string }> {
  const config = getConfig(type);
  const { timeline } = config;
  const currentStepIndex = timeline.findIndex((step) => step.status === status);
  const effectiveIndex =
    currentStepIndex >= 0
      ? Math.min(currentStepIndex + 1, timeline.length)
      : timeline.length;
  const isRejected = status === "rejected" || status === "cancelled";

  return timeline.map((stepDef, index) => {
    const isPast = index < effectiveIndex;
    const isCurrent = index === effectiveIndex;
    return {
      title: stepDef.title,
      statusLabel: isRejected
        ? "Cancelled"
        : isCurrent
          ? "In progress"
          : isPast
            ? "Completed"
            : "Pending",
    };
  });
}

describe("timeline phase mapping", () => {
  describe("WORKSHOP", () => {
    test("pending: Booking completed, Review in progress", () => {
      expect(
        resolveTimelinePhases("pending", "WORKSHOP").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Booking", label: "Completed" },
        { title: "Review", label: "In progress" },
        { title: "Payment", label: "Pending" },
        { title: "Workshop", label: "Pending" },
      ]);
    });

    test("approved: Booking + Review completed, Payment in progress", () => {
      expect(
        resolveTimelinePhases("approved", "WORKSHOP").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Booking", label: "Completed" },
        { title: "Review", label: "Completed" },
        { title: "Payment", label: "In progress" },
        { title: "Workshop", label: "Pending" },
      ]);
    });

    test("paid: first three completed, Workshop in progress", () => {
      expect(
        resolveTimelinePhases("paid", "WORKSHOP").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Booking", label: "Completed" },
        { title: "Review", label: "Completed" },
        { title: "Payment", label: "Completed" },
        { title: "Workshop", label: "In progress" },
      ]);
    });

    test("completed: all steps completed", () => {
      const phases = resolveTimelinePhases("completed", "WORKSHOP");
      expect(phases.every((p) => p.statusLabel === "Completed")).toBe(true);
      expect(phases).toHaveLength(4);
    });

    test("rejected: all steps Cancelled", () => {
      expect(
        resolveTimelinePhases("rejected", "WORKSHOP").every(
          (p) => p.statusLabel === "Cancelled",
        ),
      ).toBe(true);
    });

    test("cancelled: all steps Cancelled", () => {
      expect(
        resolveTimelinePhases("cancelled", "WORKSHOP").every(
          (p) => p.statusLabel === "Cancelled",
        ),
      ).toBe(true);
    });

    test("claimed (override): all Completed since claimed is beyond timeline", () => {
      expect(
        resolveTimelinePhases("claimed", "WORKSHOP").every(
          (p) => p.statusLabel === "Completed",
        ),
      ).toBe(true);
    });
  });

  describe("FABRICATION", () => {
    test("pending: Submission completed, Review in progress", () => {
      expect(
        resolveTimelinePhases("pending", "FABRICATION").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Submission", label: "Completed" },
        { title: "Review", label: "In progress" },
        { title: "Fabrication", label: "Pending" },
        { title: "Payment", label: "Pending" },
        { title: "Claim", label: "Pending" },
      ]);
    });

    test("approved: Submission + Review completed, Fabrication in progress", () => {
      expect(
        resolveTimelinePhases("approved", "FABRICATION").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Submission", label: "Completed" },
        { title: "Review", label: "Completed" },
        { title: "Fabrication", label: "In progress" },
        { title: "Payment", label: "Pending" },
        { title: "Claim", label: "Pending" },
      ]);
    });

    test("completed: Fabrication completed, Payment in progress", () => {
      expect(
        resolveTimelinePhases("completed", "FABRICATION").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Submission", label: "Completed" },
        { title: "Review", label: "Completed" },
        { title: "Fabrication", label: "Completed" },
        { title: "Payment", label: "In progress" },
        { title: "Claim", label: "Pending" },
      ]);
    });

    test("paid: first four completed, Claim in progress", () => {
      expect(
        resolveTimelinePhases("paid", "FABRICATION").map((p) => ({
          title: p.title,
          label: p.statusLabel,
        })),
      ).toEqual([
        { title: "Submission", label: "Completed" },
        { title: "Review", label: "Completed" },
        { title: "Fabrication", label: "Completed" },
        { title: "Payment", label: "Completed" },
        { title: "Claim", label: "In progress" },
      ]);
    });

    test("claimed: all steps completed", () => {
      const phases = resolveTimelinePhases("claimed", "FABRICATION");
      expect(phases.every((p) => p.statusLabel === "Completed")).toBe(true);
      expect(phases).toHaveLength(5);
    });

    test("rejected: all steps Cancelled", () => {
      expect(
        resolveTimelinePhases("rejected", "FABRICATION").every(
          (p) => p.statusLabel === "Cancelled",
        ),
      ).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Behavioral rules
// ═════════════════════════════════════════════════════════════════════════════

describe("behavioral rules", () => {
  test("workshop payableStatuses includes approved (pre-pay)", () => {
    expect(getWorkflow("WORKSHOP").payableStatuses).toContain("approved");
  });

  test("workshop payableStatuses includes completed (backward navigation)", () => {
    expect(getWorkflow("WORKSHOP").payableStatuses).toContain("completed");
  });

  test("fabrication payableStatuses includes completed (post-pay)", () => {
    expect(getWorkflow("FABRICATION").payableStatuses).toContain("completed");
  });

  test("fabrication payableStatuses does not include approved", () => {
    expect(getWorkflow("FABRICATION").payableStatuses).not.toContain(
      "approved",
    );
  });

  test("both types include 'paid' in payableStatuses", () => {
    expect(getWorkflow("WORKSHOP").payableStatuses).toContain("paid");
    expect(getWorkflow("FABRICATION").payableStatuses).toContain("paid");
  });

  test("workshop approval does not require maker assignment", () => {
    expect(getWorkflow("WORKSHOP").approvalRequiresMaker).toBe(false);
  });

  test("fabrication approval requires maker assignment", () => {
    expect(getWorkflow("FABRICATION").approvalRequiresMaker).toBe(true);
  });
});
