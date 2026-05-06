import {
  CALENDAR_MONTH_CELL_MIN_HEIGHT,
  CALENDAR_MONTH_DAY_MIN_WIDTH,
} from "../../lib/calendar";

export const MONTH_DAY_MIN_WIDTH = CALENDAR_MONTH_DAY_MIN_WIDTH;
export const MONTH_CELL_MIN_HEIGHT = CALENDAR_MONTH_CELL_MIN_HEIGHT;

export type MonthLayoutDensity = "default" | "compact";

const MONTH_LAYOUT_DENSITY = {
  default: {
    dayHeaderHeight: 45,
    cellPaddingY: 16,
    cellEventGap: 6,
    eventCardMinHeight: 32,
    moreLabelHeight: 12,
    minVisibleEvents: 2,
  },
  compact: {
    dayHeaderHeight: 34,
    cellPaddingY: 8,
    cellEventGap: 4,
    eventCardMinHeight: 24,
    moreLabelHeight: 10,
    minVisibleEvents: 1,
  },
} as const satisfies Record<
  MonthLayoutDensity,
  {
    dayHeaderHeight: number;
    cellPaddingY: number;
    cellEventGap: number;
    eventCardMinHeight: number;
    moreLabelHeight: number;
    minVisibleEvents: number;
  }
>;

function getMonthContentHeight(
  rowHeight: number,
  density: MonthLayoutDensity = "default",
) {
  const layout = MONTH_LAYOUT_DENSITY[density];

  return Math.max(
    rowHeight - layout.dayHeaderHeight - layout.cellPaddingY,
    layout.eventCardMinHeight * layout.minVisibleEvents +
      Math.max(layout.minVisibleEvents - 1, 0) * layout.cellEventGap,
  );
}

export function getMonthVisibleEventLimit(
  rowHeight: number,
  totalEvents: number,
  density: MonthLayoutDensity = "default",
) {
  if (totalEvents === 0) return 0;

  const layout = MONTH_LAYOUT_DENSITY[density];
  const availableHeight = getMonthContentHeight(rowHeight, density);
  let visibleCount = Math.max(
    layout.minVisibleEvents,
    Math.floor(
      (availableHeight + layout.cellEventGap) /
        (layout.eventCardMinHeight + layout.cellEventGap),
    ),
  );

  visibleCount = Math.min(visibleCount, totalEvents);

  while (visibleCount > layout.minVisibleEvents && visibleCount < totalEvents) {
    const contentHeight =
      visibleCount * layout.eventCardMinHeight +
      Math.max(visibleCount - 1, 0) * layout.cellEventGap +
      layout.cellEventGap +
      layout.moreLabelHeight;

    if (contentHeight <= availableHeight) break;

    visibleCount -= 1;
  }

  return visibleCount;
}

export function canShowMonthOverflowLabel(
  rowHeight: number,
  visibleCount: number,
  density: MonthLayoutDensity = "default",
) {
  if (visibleCount === 0) return false;

  const layout = MONTH_LAYOUT_DENSITY[density];
  const availableHeight = getMonthContentHeight(rowHeight, density);
  const requiredHeight =
    visibleCount * layout.eventCardMinHeight +
    Math.max(visibleCount - 1, 0) * layout.cellEventGap +
    layout.cellEventGap +
    layout.moreLabelHeight;

  return requiredHeight <= availableHeight;
}
