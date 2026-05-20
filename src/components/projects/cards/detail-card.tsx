"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailCardProps {
  title: string;
  titleColor?: string;
  titleClassName?: string;
  headerBg?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  onEdit?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

export function DetailCard({
  title,
  titleColor = "text-black/60",
  titleClassName,
  headerBg = "bg-fab-amber/20",
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
}: DetailCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 border-black shadow-none transition-shadow duration-200 hover:shadow-[4px_4px_0_0_#000]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        className={cn(
          "flex w-full items-center gap-2 border-b-2 border-black px-4 py-2.5 text-left",
          headerBg,
        )}
      >
        <span
          className={cn(
            "flex-1 text-[10px] font-black uppercase tracking-[0.25em]",
            titleColor,
            titleClassName,
          )}
        >
          {title}
        </span>

        {headerRight && (
          <div className="flex items-center gap-1.5">{headerRight}</div>
        )}

        {onEdit && !isEditing && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-black/40 hover:text-black"
          >
            <Pencil className="h-3.5 w-3.5" />
          </span>
        )}

        <ChevronDown
          className={cn(
            "size-4 text-black/40 transition-transform duration-200",
            collapsed && "-rotate-90",
          )}
          strokeWidth={3}
        />
      </button>

      {!collapsed && (
        <div
          className={cn("bg-white px-4 py-4", bodyClassName)}
          style={bodyStyle}
        >
          {children}

          {isEditing && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="h-px w-full bg-black" />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="inline-flex h-8 items-center border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="inline-flex h-8 items-center border-2 border-black bg-fab-teal px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
      className="inline-flex items-center border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
      style={{
        background: bg,
        color,
        border: border ? `2px solid ${border}` : undefined,
      }}
    >
      {label}
    </span>
  );
}
