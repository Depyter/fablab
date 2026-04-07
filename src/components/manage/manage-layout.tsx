import React, { ReactNode } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface ManageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  children?: ReactNode; // For actions like Add buttons, view toggles
}

export function ManageHeader({
  title,
  subtitle,
  children,
}: ManageHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-base leading-tight truncate">{title}</h1>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

interface ManageFilterBarProps {
  children?: ReactNode;
}

export function ManageFilterBar({ children }: ManageFilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20 shrink-0 flex-wrap">
      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 hidden sm:block" />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Search Input
// ---------------------------------------------------------------------------

interface ManageFilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export function ManageFilterSearch({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
  className,
}: ManageFilterSearchProps) {
  return (
    <div className={cn("relative flex-1 min-w-36 max-w-64", className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 pl-7 text-xs bg-background border-border/60 shadow-none"
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Clear Button
// ---------------------------------------------------------------------------

interface ManageFilterClearProps {
  activeCount: number;
  onClear: () => void;
}

export function ManageFilterClear({
  activeCount,
  onClear,
}: ManageFilterClearProps) {
  if (activeCount === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClear}
      className="h-7 px-2 text-xs text-muted-foreground gap-1 hover:text-foreground"
    >
      <X className="h-3 w-3" />
      Clear
      <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
        {activeCount}
      </span>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Grid Content Area
// ---------------------------------------------------------------------------

interface ManageGridProps {
  children: ReactNode;
  className?: string;
}

export function ManageGrid({ children, className }: ManageGridProps) {
  return (
    <div className={cn("p-4 sm:p-6 overflow-y-auto flex-1 h-full", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty States
// ---------------------------------------------------------------------------

interface ManageEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function ManageEmptyState({
  icon,
  title,
  description,
  action,
}: ManageEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 flex-1 h-full">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-muted p-6 text-muted-foreground">
          {icon}
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
