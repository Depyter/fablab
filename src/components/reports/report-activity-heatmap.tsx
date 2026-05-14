"use client";

import * as React from "react";
import {
  Tooltip as TooltipRoot,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyActivity {
  dateKey: string;
  weekday: number;
  projectCount: number;
  usageCount: number;
  totalCount: number;
}

interface ReportActivityHeatmapProps {
  dailyActivity: DailyActivity[] | null;
  isLoading: boolean;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CELL_GAP = 3;
const DAY_LABEL_W = 28;
const MONTH_LABEL_H = 18;
const MIN_CELL = 8;
const MAX_CELL = 40;

function formatDate(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

function getIntensity(count: number, maxCount: number): number {
  if (count === 0) return 0;
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const LEVEL_COLORS = [
  "var(--muted)",
  "hsl(210, 50%, 85%)",
  "hsl(210, 60%, 70%)",
  "hsl(210, 70%, 50%)",
  "hsl(210, 80%, 35%)",
];

export function ReportActivityHeatmap({
  dailyActivity,
  isLoading,
}: ReportActivityHeatmapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxCount = React.useMemo(
    () =>
      dailyActivity?.reduce((max, d) => Math.max(max, d.totalCount), 0) ?? 0,
    [dailyActivity],
  );

  const activityMap = React.useMemo(() => {
    const map = new Map<string, DailyActivity>();
    for (const d of dailyActivity ?? []) {
      map.set(d.dateKey, d);
    }
    return map;
  }, [dailyActivity]);

  const { weeks, monthMarkers } = React.useMemo(() => {
    if (!dailyActivity?.length) return { weeks: [], monthMarkers: [] };

    const sorted = [...dailyActivity];
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const startDate = new Date(first.dateKey + "T00:00:00");
    const endDate = new Date(last.dateKey + "T00:00:00");

    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const cols: Array<Array<{ dateKey: string; count: number } | null>> = [];
    const markers: Array<{ col: number; label: string }> = [];
    let prevMonth = -1;

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const week: Array<{ dateKey: string; count: number } | null> = [];
      for (let d = 0; d < 7; d++) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
        const act = activityMap.get(key);

        if (cursor.getMonth() !== prevMonth) {
          prevMonth = cursor.getMonth();
          const existing = markers.find((m) => m.col === cols.length);
          if (!existing) {
            markers.push({
              col: cols.length,
              label: MONTH_LABELS[cursor.getMonth()],
            });
          }
        }

        week.push(act ? { dateKey: key, count: act.totalCount } : null);
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(week);
    }

    return { weeks: cols, monthMarkers: markers };
  }, [dailyActivity, activityMap]);

  const numWeeks = weeks.length;
  const cellSize = React.useMemo(() => {
    if (numWeeks === 0 || containerWidth === 0) return MIN_CELL;
    const avail = containerWidth - DAY_LABEL_W - 4 - (numWeeks - 1) * CELL_GAP;
    return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(avail / numWeeks)));
  }, [numWeeks, containerWidth]);

  const colW = cellSize + CELL_GAP;
  const rowH = cellSize + CELL_GAP;
  const svgW = DAY_LABEL_W + numWeeks * colW;
  const svgH = MONTH_LABEL_H + 7 * rowH + 4;

  const legendLevels = [0, 1, 2, 3, 4];

  if (isLoading) {
    return (
      <Card className="flex flex-col flex-1">
        <CardHeader className="pb-1 shrink-0">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dailyActivity?.length || weeks.length === 0) {
    return (
      <Card className="flex flex-col flex-1">
        <CardHeader className="pb-1 shrink-0">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No activity data in this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col flex-1">
      <CardHeader className="pb-1 shrink-0">
        <CardTitle className="text-sm font-medium">Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto min-h-0 flex flex-col">
        <div ref={containerRef} className="flex-1 min-h-0">
          <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
            {/* Month labels */}
            {monthMarkers.map((m) => (
              <text
                key={m.label}
                x={DAY_LABEL_W + m.col * colW}
                y={12}
                fontSize={11}
                fill="var(--muted-foreground)"
                fontWeight={500}
              >
                {m.label}
              </text>
            ))}

            {/* Day labels — all 7 days */}
            {DAY_LABELS.map((label, row) => (
              <text
                key={label}
                x={DAY_LABEL_W - 4}
                y={MONTH_LABEL_H + row * rowH + cellSize - 2}
                fontSize={10}
                fill="var(--muted-foreground)"
                textAnchor="end"
              >
                {label}
              </text>
            ))}

            {/* Cells */}
            {weeks.map((week, col) =>
              week.map((cell, row) => {
                const level = cell ? getIntensity(cell.count, maxCount) : 0;
                const x = DAY_LABEL_W + col * colW;
                const y = MONTH_LABEL_H + row * rowH;
                return cell ? (
                  <TooltipRoot key={cell.dateKey}>
                    <TooltipTrigger asChild>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        rx={2}
                        fill={LEVEL_COLORS[level]}
                        opacity={level > 0 ? 1 : 0.35}
                        className="cursor-default"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{formatDate(cell.dateKey)}</p>
                      <p>
                        {cell.count}{" "}
                        {cell.count === 1 ? "activity" : "activities"}
                      </p>
                    </TooltipContent>
                  </TooltipRoot>
                ) : (
                  <rect
                    key={`empty-${col}-${row}`}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill="var(--muted)"
                    opacity={0}
                  />
                );
              }),
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 pt-3 text-[10px] text-muted-foreground shrink-0">
          <span>Less</span>
          {legendLevels.map((level) => (
            <div
              key={level}
              className="rounded-sm"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: LEVEL_COLORS[level],
                opacity: level > 0 ? 1 : 0.35,
              }}
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
