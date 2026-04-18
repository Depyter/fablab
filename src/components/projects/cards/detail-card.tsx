"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailCardProps {
  /** Small-caps label shown on the left of the header */
  title: string;
  /** Override the header title color. Defaults to var(--fab-text-dim) */
  titleColor?: string;
  /** Extra className on the title span */
  titleClassName?: string;
  /** Override the header background. Defaults to var(--fab-bg-sidebar) */
  headerBg?: string;
  /** Chips / badges / counts rendered to the right of the title, before the pen */
  headerRight?: ReactNode;
  /** Card body content */
  children: ReactNode;
  /** Extra className on the outer wrapper */
  className?: string;
  /** Extra className / style on the body wrapper */
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;

  // ── Edit-pen controls ─────────────────────────────────────────────────────
  /** If provided, a pen icon is shown when not editing */
  onEdit?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  /** Pen icon color. Defaults to var(--fab-text-dim) */
  penColor?: string;
}

export function DetailCard({
  title,
  titleColor = "var(--fab-text-dim)",
  titleClassName,
  headerBg = "var(--fab-bg-sidebar)",
  headerRight,
  children,
  className,
  bodyClassName,
  bodyStyle,
  onEdit,
  isEditing,
  onSave,
  onCancel,
  isSaving,
  penColor,
}: DetailCardProps) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl", className)}
      style={{ border: "1px solid var(--fab-border-md)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: headerBg,
          borderBottom: "1px solid var(--fab-border-md)",
        }}
      >
        <span
          className={cn(
            "flex-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            titleClassName,
          )}
          style={{ color: titleColor }}
        >
          {title}
        </span>

        {headerRight && (
          <div className="flex items-center gap-1.5">{headerRight}</div>
        )}

        {/* Edit controls */}
        {onEdit && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onEdit}
            aria-label={`Edit ${title}`}
          >
            <Pencil
              className="h-3.5 w-3.5"
              style={{ color: penColor ?? "var(--fab-text-dim)" }}
            />
          </Button>
        )}
        {isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCancel}
              disabled={isSaving}
              aria-label="Cancel edit"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-6 w-6"
              onClick={onSave}
              disabled={isSaving}
              aria-label="Save changes"
              style={{ background: "var(--fab-teal)", color: "#fff" }}
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={cn("px-4 py-4", bodyClassName)}
        style={{ background: "var(--fab-bg-card)", ...bodyStyle }}
      >
        {children}
      </div>
    </div>
  );
}

/** A small inline chip, consistent across all cards */
export function DetailChip({
  label,
  bg,
  color,
  border,
}: {
  label: string;
  bg: string;
  color: string;
  border?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em]"
      style={{
        background: bg,
        color,
        border: border ? `1px solid ${border}` : undefined,
      }}
    >
      {label}
    </span>
  );
}
