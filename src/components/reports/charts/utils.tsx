"use client";

import * as React from "react";

export const CHART_COLORS = [
  "var(--chart-1, #2563eb)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #d97706)",
  "var(--chart-4, #dc2626)",
  "var(--chart-5, #8b5cf6)",
  "var(--chart-6, #ec4899)",
  "var(--chart-7, #06b6d4)",
] as const;

export const PIE_COLORS = [...CHART_COLORS, "var(--chart-8, #f97316)"] as const;

export interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

export interface PieTooltipEntry {
  name: string;
  color: string;
  payload?: { formattedValue?: string };
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Wraps a chart in a debounced ResizeObserver, replacing recharts'
 * ResponsiveContainer. Uses requestAnimationFrame to coalesce
 * multiple resize events into a single paint-cycle update, preventing
 * all charts from re-rendering independently on every resize frame.
 */
export function ChartContainer({
  children,
  className,
}: {
  children: React.ReactElement<{ width?: number; height?: number }>;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // Debounce via requestAnimationFrame — coalesces into paint cycle
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      });
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ contain: "content" }}>
      {size.width > 0 && size.height > 0
        ? React.cloneElement(children, {
            width: size.width,
            height: size.height,
          })
        : null}
    </div>
  );
}

export function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PieTooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{entry.name}</p>
      <p style={{ color: entry.color }}>{entry.payload?.formattedValue}</p>
    </div>
  );
}
