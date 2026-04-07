"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";

export type ProjectTimelineStep = {
  title: string;
  statusLabel: string;
  byLabel: string;
  active?: boolean;
  completed?: boolean;
};

interface ProjectTimelineProps {
  steps: ProjectTimelineStep[];
  className?: string;
}

function StepDot({
  active,
  completed,
}: {
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background shadow-sm sm:h-10 sm:w-10",
        completed && "border-chart-6 bg-secondary/10 text-chart-6",
        active && !completed && "border-primary bg-primary-muted text-primary",
        !active && !completed && "border-muted-foreground/20 bg-muted text-muted-foreground",
      )}
    >
      {completed ? (
        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <Circle className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
      )}
    </div>
  );
}

export function ProjectTimeline({ steps, className }: ProjectTimelineProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={cn("w-full", className)}>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left"
        >
          <div>
            <p className="text-sm font-semibold">Project Timeline</p>
          
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              mobileOpen && "rotate-180",
            )}
          />
        </button>

        {mobileOpen && (
          <div className="mt-3 rounded-xl border bg-background p-3">
            <div className="space-y-0">
              {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <StepDot active={step.active} completed={step.completed} />
                      {!isLast && (
                        <div className="my-2 h-full w-px flex-1 bg-muted-foreground/20" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-4">
                      <h4 className="text-sm font-semibold leading-tight wrap-break-word">
                        {step.title}
                      </h4>
                      <p
                        className={cn(
                          "text-xs",
                          step.completed && "text-chart-6",
                          step.active && !step.completed && "text-primary",
                          !step.active && !step.completed && "text-muted-foreground",
                        )}
                      >
                        {step.statusLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By: {step.byLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <div className="flex min-w-180 items-start gap-3 pb-2 lg:min-w-0 lg:gap-4">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <div key={step.title} className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <div className="flex w-36 shrink-0 flex-col items-center text-center sm:w-44 lg:w-full lg:max-w-44">
                  <StepDot active={step.active} completed={step.completed} />

                  <div className="mt-3 space-y-1">
                    <h4 className="text-[11px] font-semibold leading-tight sm:text-sm wrap-break-word">
                      {step.title}
                    </h4>
                    <p
                      className={cn(
                        "text-[10px] sm:text-xs",
                        step.completed && "text-chart-6",
                        step.active && !step.completed && "text-primary",
                        !step.active && !step.completed && "text-muted-foreground",
                      )}
                    >
                      {step.statusLabel}
                    </p>
                    
                  </div>
                </div>

                {!isLast && (
                  <div className="mt-4 min-w-12 flex-1 sm:mt-5 sm:min-w-20">
                    <div
                      className={cn(
                        "h-0.5 rounded-full bg-muted-foreground/20",
                        step.completed && "bg-chart-6/70",
                        step.active && !step.completed && "bg-primary/70",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
