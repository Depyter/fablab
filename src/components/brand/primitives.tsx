import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ---------------------------------------------------------------------------
// GridBackground — repeating crosshatch grid overlay
// ---------------------------------------------------------------------------

type GridBackgroundProps = {
  className?: string;
  opacity?: string;
};

export function GridBackground({
  className,
  opacity = "opacity-20",
}: GridBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px]",
        opacity,
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// BrandCard — border-4 border-black shadow container
// ---------------------------------------------------------------------------

type BrandCardProps = {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  shadow?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const BrandCard = React.forwardRef<HTMLDivElement, BrandCardProps>(
  (
    {
      children,
      className,
      highlight,
      shadow = "shadow-[6px_6px_0_0_#000]",
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden border-4 border-black bg-white transition-all duration-200",
          shadow,
          highlight && "border-fab-amber shadow-[6px_6px_0_0_#d97706]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

BrandCard.displayName = "BrandCard";

// ---------------------------------------------------------------------------
// SectionBadge — section header with optional icon, title, and count
// ---------------------------------------------------------------------------

type SectionBadgeProps = {
  icon?: React.ReactNode;
  title: string;
  count?: number;
  className?: string;
  variant?: "amber" | "muted";
};

export function SectionBadge({
  icon,
  title,
  count,
  className,
  variant = "amber",
}: SectionBadgeProps) {
  return (
    <div
      className={cn(
        "mb-4 inline-flex items-center gap-3 border-4 border-black px-5 py-2.5 shadow-[5px_5px_0_0_#000]",
        variant === "amber" ? "bg-fab-amber" : "bg-white",
        className,
      )}
    >
      {icon && (
        <span className={variant === "amber" ? "text-black" : "text-black/50"}>
          {icon}
        </span>
      )}
      <h2
        className={cn(
          "text-lg font-black uppercase tracking-tighter",
          variant === "amber" ? "text-black" : "text-black/60",
        )}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center border-2 border-black text-xs font-black",
            variant === "amber"
              ? "bg-white text-black"
              : "bg-black/5 text-black/60",
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionLabel — small uppercase label
// ---------------------------------------------------------------------------

type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-[10px] font-black uppercase tracking-[0.25em] text-black/60",
        className,
      )}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge — border-2 border-black status pill with dot
// ---------------------------------------------------------------------------

export type StatusColorSet = {
  bg: string;
  text: string;
  dot: string;
};

type StatusBadgeProps = {
  label: string;
  colors: StatusColorSet;
  count?: number;
  className?: string;
};

export function StatusBadge({
  label,
  colors,
  count,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
        colors.bg,
        colors.text,
        className,
      )}
    >
      <span className={cn("h-2 w-2", colors.dot)} />
      {label}
      {count !== undefined && <span className="ml-1">{count}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CapacityBar — bordered track with colored fill
// ---------------------------------------------------------------------------

type CapacityBarProps = {
  usedSlots: number;
  maxSlots: number;
  className?: string;
};

export function CapacityBar({
  usedSlots,
  maxSlots,
  className,
}: CapacityBarProps) {
  const percentage =
    maxSlots > 0 ? Math.min((usedSlots / maxSlots) * 100, 100) : 0;
  const isFull = usedSlots >= maxSlots;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-3 flex-1 overflow-hidden border-2 border-black bg-white">
        <div
          className={cn(
            "h-full transition-all duration-500",
            isFull ? "bg-fab-amber" : "bg-fab-teal",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="shrink-0 text-sm font-black text-black">
        {usedSlots}/{maxSlots}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandSkeleton — loading placeholder matching the brand card style
// ---------------------------------------------------------------------------

type BrandSkeletonProps = {
  className?: string;
};

export function BrandSkeleton({ className }: BrandSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse border-4 border-black bg-black/5 shadow-[6px_6px_0_0_#000]",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// BrandSelect — select with border-2 border-black + shadow branding
// ---------------------------------------------------------------------------

type BrandSelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder: string;
  children: React.ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
};

export function BrandSelect({
  value,
  onValueChange,
  defaultValue,
  placeholder,
  children,
  triggerClassName,
  contentClassName,
}: BrandSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-full border-2 border-black bg-white text-xs font-black uppercase tracking-tighter shadow-[2px_2px_0_0_#000]",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className={cn(
          "border-2 border-black shadow-[3px_3px_0_0_#000]",
          contentClassName,
        )}
      >
        {children}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// BrandFilterClear — amber-toned clear filters button
// ---------------------------------------------------------------------------

interface BrandFilterClearProps {
  onClick: () => void;
  label?: string;
  count?: number;
}

export function BrandFilterClear({
  onClick,
  label = "Clear",
  count,
}: BrandFilterClearProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center border-2 border-black bg-fab-amber px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
    >
      {label}
      {count !== undefined && <span className="ml-1">({count})</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// BrandButton — border-2 border-black pill button
// ---------------------------------------------------------------------------

type BrandButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  active?: boolean;
  activeBg?: string;
} & React.ComponentPropsWithoutRef<"button">;

export const BrandButton = React.forwardRef<
  HTMLButtonElement,
  BrandButtonProps
>(
  (
    {
      children,
      onClick,
      href,
      className,
      active,
      activeBg = "bg-fab-teal",
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex h-9 items-center gap-1.5 border-2 border-black px-3 text-[10px] font-black uppercase tracking-wider";

    const classes = cn(
      base,
      active ? cn(activeBg, "text-white") : "bg-white text-black",
      className,
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);

BrandButton.displayName = "BrandButton";

// ---------------------------------------------------------------------------
// BrandSegmentedControl — segmented button group (gallery/list, day/week/month, etc.)
// ---------------------------------------------------------------------------

type BrandSegmentedControlOption<T extends string> = {
  value: T;
  label?: string;
  icon?: React.ReactNode;
};

type BrandSegmentedControlProps<T extends string> = {
  options: readonly BrandSegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Hide labels on mobile (< sm breakpoint). Icons always show. */
  hideLabels?: boolean;
};

export function BrandSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  hideLabels,
}: BrandSegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center border-2 border-black bg-white",
        className,
      )}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-full items-center justify-center gap-1 px-2.5 transition-colors",
            index < options.length - 1 && "border-r-2 border-black",
            value === option.value
              ? "bg-fab-amber text-black"
              : "text-black/50 hover:text-black",
          )}
        >
          {option.icon && <span className="size-4">{option.icon}</span>}
          {option.label && (
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-wider",
                hideLabels && "hidden sm:inline",
              )}
            >
              {option.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandFilterPanel — sheet on mobile, popover on desktop
// ---------------------------------------------------------------------------

type BrandFilterPanelProps = {
  title: string;
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
};

export function BrandFilterPanel({
  title,
  activeCount,
  onClear,
  children,
}: BrandFilterPanelProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-1.5 border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black"
    >
      <SlidersHorizontal className="size-4" strokeWidth={3} />
      <span className="hidden sm:inline">Filters</span>
      {activeCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center border-2 border-black bg-fab-amber text-[9px] font-black text-black">
          {activeCount}
        </span>
      )}
    </button>
  );

  const content = <div className="space-y-4">{children}</div>;

  const footer = (
    <div className="flex items-center justify-between gap-2">
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            onClear();
            setOpen(false);
          }}
          className="inline-flex h-8 items-center border-2 border-black bg-fab-amber px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
        >
          Clear filters
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex h-8 items-center border-2 border-black bg-fab-teal px-4 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
      >
        Done
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-t-4 border-black bg-white p-0 shadow-[-4px_-4px_0_0_#000]"
        >
          <SheetHeader className="border-b-2 border-black px-4 py-3">
            <SheetTitle className="text-sm font-black uppercase tracking-tighter">
              {title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Adjust the current filters.
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[60svh] space-y-4 overflow-y-auto px-4 py-4">
            {content}
          </div>
          <SheetFooter className="border-t-2 border-black px-4 py-3">
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
      >
        <PopoverHeader className="mb-3 gap-1">
          <PopoverTitle className="text-sm font-black uppercase tracking-tighter">
            {title}
          </PopoverTitle>
        </PopoverHeader>
        {content}
        <div className="mt-4">{footer}</div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// BrandSearchField — brand-styled search with embedded icon
// ---------------------------------------------------------------------------

import { DataViewSearchField } from "@/components/manage/data-view-toolbar";

type BrandSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Key to force re-mount (e.g. `${pathname}:${search}`) */
  remountKey?: string;
  className?: string;
};
export function BrandSearchField({
  value,
  onChange,
  placeholder = "Search…",
  remountKey,
  className,
}: BrandSearchFieldProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-white text-black"
          >
            <Search className="size-4" strokeWidth={3} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-t-4 border-black bg-white p-0 shadow-[0_-4px_0_0_#000]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Search</SheetTitle>
            <SheetDescription>Search through items.</SheetDescription>
          </SheetHeader>
          <div className="px-3 py-3">
            <DataViewSearchField
              key={remountKey}
              search={value}
              onSearchChange={(v) => onChange(v)}
              placeholder={placeholder}
              className="w-full max-w-none rounded-none border-2 border-black bg-white pl-10 text-sm font-bold text-black placeholder:text-black/40 shadow-none"
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={cn("relative flex-1 min-w-0", className)}>
      <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 z-10"
        strokeWidth={3}
      />
      <DataViewSearchField
        key={remountKey}
        search={value}
        onSearchChange={(v) => onChange(v)}
        placeholder={placeholder}
        className="w-full rounded-none border-2 border-black bg-white pl-10 text-sm font-bold text-black placeholder:text-black/40 shadow-none"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandTabs — branded tab list and trigger
// ---------------------------------------------------------------------------

import {
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
} from "@/components/ui/tabs";

type BrandTabsListProps = React.ComponentProps<typeof ShadcnTabsList>;

export function BrandTabsList({ className, ...props }: BrandTabsListProps) {
  return (
    <ShadcnTabsList
      className={cn(
        "flex h-10 w-full items-center gap-0 bg-transparent p-0 rounded-none",
        className,
      )}
      {...props}
    />
  );
}

type BrandTabsTriggerProps = React.ComponentProps<typeof ShadcnTabsTrigger>;

export function BrandTabsTrigger({
  className,
  ...props
}: BrandTabsTriggerProps) {
  return (
    <ShadcnTabsTrigger
      className={cn(
        "relative flex-1 inline-flex h-10 items-center justify-center gap-1.5 border-t-4 border-r-4 border-b-4 border-l-0 border-black bg-white px-4 text-[10px] font-black uppercase tracking-wider transition-colors",
        "data-active:bg-fab-amber data-active:text-black data-active:border-t-0",
        "text-black/50 hover:text-black",
        "rounded-none last:border-r-0",
        "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}
