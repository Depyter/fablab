"use client";

import { cn } from "@/lib/utils";
import { XCircle } from "lucide-react";

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

function Dot({ status }: { status: ProjectTimelineStep }) {
  if (status.rejected) {
    return <XCircle className="size-7 text-red-500" strokeWidth={2.5} />;
  }
  if (status.completed) {
    return (
      <div className="size-7 shrink-0 rounded-full border-4 border-fab-teal bg-fab-teal" />
    );
  }
  if (status.active) {
    return (
      <div className="size-7 shrink-0 rounded-full border-4 border-fab-amber bg-fab-amber" />
    );
  }
  return (
    <div className="size-7 shrink-0 rounded-full border-4 border-black/20 bg-transparent" />
  );
}

function Line({ complete }: { complete?: boolean }) {
  return (
    <div
      className={cn(
        "h-0.75 flex-1 min-w-2 rounded-full",
        complete ? "bg-fab-teal" : "bg-black/15",
      )}
    />
  );
}

export function ProjectTimeline({ steps, className }: ProjectTimelineProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* ── Desktop: horizontal dots + line row ── */}
      <div
        className="hidden sm:grid"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const lineComplete = step.completed && !step.rejected;

          return (
            <div
              key={step.title}
              className="flex min-w-0 flex-col items-center text-center"
            >
              <div className="relative flex h-7 w-full items-center justify-center">
                {index > 0 && (
                  <div className="absolute left-0 right-1/2 flex items-center pr-3.5">
                    <Line
                      complete={
                        steps[index - 1].completed && !steps[index - 1].rejected
                      }
                    />
                  </div>
                )}
                <Dot status={step} />
                {!isLast && (
                  <div className="absolute left-1/2 right-0 flex items-center pl-3.5">
                    <Line complete={lineComplete} />
                  </div>
                )}
              </div>

              <div className="mt-2 flex min-w-0 flex-col items-center px-1.5">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                    step.active
                      ? "text-fab-amber"
                      : step.completed || step.rejected
                        ? "text-fab-teal"
                        : "text-black/30",
                  )}
                >
                  Step {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-black uppercase tracking-tight leading-tight",
                    step.active
                      ? "text-black"
                      : step.completed || step.rejected
                        ? "text-black/50"
                        : "text-black/20",
                  )}
                >
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile: vertical timeline ── */}
      <div className="flex flex-col gap-0 sm:hidden">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const lineComplete = step.completed && !step.rejected;

          return (
            <div
              key={step.title}
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3"
            >
              {/* Dot + line column */}
              <div className="flex flex-col items-center">
                <Dot status={step} />
                {!isLast && (
                  <div
                    className={cn(
                      "mt-1 w-0.75 min-h-6 flex-1 rounded-full",
                      lineComplete ? "bg-fab-teal" : "bg-black/15",
                    )}
                  />
                )}
              </div>

              {/* Label column */}
              <div className={cn("min-w-0 pt-0.5", !isLast && "pb-4")}>
                <span
                  className={cn(
                    "mb-1.5 block text-[10px] font-bold uppercase tracking-wider",
                    step.active
                      ? "text-fab-amber"
                      : step.completed || step.rejected
                        ? "text-fab-teal"
                        : "text-black/30",
                  )}
                >
                  Step {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-black uppercase tracking-tight leading-tight",
                    step.active
                      ? "text-black"
                      : step.completed || step.rejected
                        ? "text-black/50"
                        : "text-black/20",
                  )}
                >
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
