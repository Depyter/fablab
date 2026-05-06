"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function DataViewFilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function DataViewFilterPanel({
  activeCount,
  title,
  onClear,
  children,
}: {
  activeCount: number;
  title: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1.5 border-border/60 bg-background shadow-none"
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="hidden sm:inline">Filters</span>
      {activeCount > 0 ? (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );

  const actions = (
    <>
      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : (
        <div />
      )}
      <Button size="sm" onClick={() => setOpen(false)}>
        Done
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85svh] gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">
              Adjust the current filters.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {children}
          </div>
          <SheetFooter className="border-t px-4 py-3 sm:flex-row sm:justify-between">
            {actions}
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
        className="w-80 max-w-[calc(100vw-1rem)] gap-4 p-4"
      >
        <PopoverHeader className="gap-1">
          <PopoverTitle>{title}</PopoverTitle>
        </PopoverHeader>
        <div className="space-y-3">{children}</div>
        <div className="flex items-center justify-between gap-2">{actions}</div>
      </PopoverContent>
    </Popover>
  );
}

export function DataViewSearchField({
  search,
  onSearchChange,
  placeholder,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [searchDraft, setSearchDraft] = React.useState(search);
  const debouncedSearch = useDebounce(searchDraft, 250);

  React.useEffect(() => {
    if (debouncedSearch === search) return;
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange, search]);

  return (
    <Input
      value={searchDraft}
      onChange={(event) => setSearchDraft(event.target.value)}
      placeholder={placeholder}
      className={cn("min-w-0 flex-1 max-w-xs", className)}
    />
  );
}
