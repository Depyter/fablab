"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ViewHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * The root container for a unified header.
 * Stays sticky at the top and provides the standard background.
 */
export function ViewHeader({ children, className, ...props }: ViewHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex flex-col shrink-0 border-b bg-[var(--fab-bg-sidebar)] backdrop-blur-md",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}

interface ViewHeaderRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A single row within the ViewHeader.
 */
export function ViewHeaderRow({
  children,
  className,
  ...props
}: ViewHeaderRowProps) {
  return (
    <div
      className={cn(
        "flex h-10 sm:h-12 w-full items-center gap-2 px-2 sm:px-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ViewHeaderLeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  width: number | string;
  children?: React.ReactNode;
  sticky?: boolean;
}

/**
 * A leading section within a row, typically aligned with a data column.
 * Can be made sticky to stay visible during horizontal scrolling.
 */
export function ViewHeaderLeading({
  width,
  children,
  sticky = true,
  className,
  style,
  ...props
}: ViewHeaderLeadingProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center overflow-hidden",
        sticky && "sticky left-0 z-10 bg-[var(--fab-bg-sidebar)]",
        className,
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The main content area of a header row.
 */
export function ViewHeaderMain({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-1 items-center gap-2 min-w-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}
