"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

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

export function ProjectTimeline({ steps, className }: ProjectTimelineProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-2 border-black bg-white px-2 py-1.5 text-[10px] font-black uppercase tracking-wider",
        className,
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <span key={step.title} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-black/20 mx-0.5">/</span>}
            {step.completed && !step.rejected && (
              <CheckCircle2 className="size-3 text-fab-teal" strokeWidth={3} />
            )}
            {step.rejected && (
              <XCircle className="size-3 text-red-500" strokeWidth={3} />
            )}
            <span
              className={cn(
                step.active
                  ? "text-black"
                  : step.completed || step.rejected
                    ? "text-black/40"
                    : "text-black/20",
              )}
            >
              {step.title}
            </span>
            {isLast && step.active && !step.completed && (
              <span className="ml-0.5 inline-flex h-4 items-center border-2 border-black bg-fab-amber px-1 text-[8px] font-black text-black">
                NOW
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
