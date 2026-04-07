import React, { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ManageCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  coverUrl?: string | null;
  coverFallback?: ReactNode;
  badgeText?: ReactNode;
  badgeClassName?: string;
  footer?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ManageCard({
  title,
  subtitle,
  description,
  coverUrl,
  coverFallback,
  badgeText,
  badgeClassName,
  footer,
  action,
  className,
}: ManageCardProps) {
  return (
    <Card
      className={cn(
        "w-full overflow-hidden flex flex-col gap-0 p-0 shadow-none border",
        className,
      )}
    >
      {/* Cover */}
      <div className="relative h-36 w-full shrink-0 overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={typeof title === "string" ? title : "Cover"}
            className="h-full w-full object-cover"
          />
        ) : (
          coverFallback || <div className="h-full w-full bg-secondary/10" />
        )}

        {/* Status badge overlaid on cover */}
        {badgeText && (
          <span
            className={cn(
              "absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border backdrop-blur-sm bg-background/70",
              badgeClassName
            )}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4 flex-1">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="font-bold text-sm leading-tight truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {footer && (
          <div className="flex items-center justify-between text-xs mt-auto">
            {footer}
          </div>
        )}

        {action && (
          <div className={cn("w-full", !footer ? "mt-auto pt-1" : "mt-1")}>
            {action}
          </div>
        )}
      </div>
    </Card>
  );
}
