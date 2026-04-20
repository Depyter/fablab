"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

export type ProjectTimelineStep = {
  title: string;
  statusLabel: string;
  byLabel: string;
  active?: boolean;
  completed?: boolean;
  rejected?: boolean;
};

interface ProjectTimelineProps {
  steps: ProjectTimelineStep[];
  className?: string;
}

function StepDot({
  active,
  completed,
  rejected,
}: {
  active?: boolean;
  completed?: boolean;
  rejected?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm sm:h-10 sm:w-10",
        completed &&
          !rejected &&
          "border-[var(--fab-timeline-complete)] bg-[var(--fab-timeline-complete-soft)] text-[var(--fab-timeline-complete)]",
        rejected &&
          "border-[var(--fab-timeline-rejected)] bg-[var(--fab-timeline-rejected-soft)] text-[var(--fab-timeline-rejected)]",
        active &&
          !completed &&
          !rejected &&
          "border-[var(--fab-timeline-active)] bg-[var(--fab-timeline-active-soft)] text-[var(--fab-timeline-active)]",
        !active &&
          !completed &&
          !rejected &&
          "border-[var(--fab-border-md)] bg-[var(--fab-bg-sidebar)] text-[var(--fab-text-dim)]",
      )}
    >
      {rejected ? (
        <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : completed ? (
        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <Circle className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
      )}
    </div>
  );
}

function connectorCn(
  nextCompleted?: boolean,
  nextRejected?: boolean,
  nextActive?: boolean,
) {
  if (nextRejected) return "bg-[var(--fab-timeline-rejected)]/50";
  if (nextCompleted) return "bg-[var(--fab-timeline-complete)]/50";
  if (nextActive) return "bg-[var(--fab-timeline-active)]/50";
  return "bg-[var(--fab-border-md)]";
}

export function ProjectTimeline({ steps, className }: ProjectTimelineProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* ── Mobile: vertical ─────────────────────────────────────── */}
      <div className="flex flex-col md:hidden">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <div key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepDot
                  active={step.active}
                  completed={step.completed}
                  rejected={step.rejected}
                />
                {!isLast && (
                  <div
                    className={cn(
                      "w-px min-h-8 flex-1",
                      connectorCn(
                        steps[index + 1].completed,
                        steps[index + 1].rejected,
                        steps[index + 1].active,
                      ),
                    )}
                  />
                )}
              </div>
              <div className={cn("min-w-0 flex-1", !isLast && "pb-6")}>
                <h4 className="flex h-9 items-center text-sm font-semibold leading-tight text-[var(--fab-text-primary)]">
                  {step.title}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: horizontal ──────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex min-w-180 pb-2 lg:min-w-0">
          {steps.map((step, index) => {
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;
            const next = steps[index + 1];

            return (
              <div
                key={step.title}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                {/* Connector halves flanking the dot */}
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      isFirst
                        ? "invisible"
                        : connectorCn(
                            step.completed,
                            step.rejected,
                            step.active,
                          ),
                    )}
                  />
                  <StepDot
                    active={step.active}
                    completed={step.completed}
                    rejected={step.rejected}
                  />
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      isLast
                        ? "invisible"
                        : connectorCn(
                            next.completed,
                            next.rejected,
                            next.active,
                          ),
                    )}
                  />
                </div>

                <div className="mt-3 px-1 text-center">
                  <h4 className="text-[11px] font-semibold leading-tight text-[var(--fab-text-primary)] sm:text-sm break-words">
                    {step.title}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
