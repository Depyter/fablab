export const MONTH_DAY_MIN_WIDTH = 144;
export const MONTH_CELL_MIN_HEIGHT = 152;

const MONTH_DAY_HEADER_HEIGHT = 45;
const MONTH_CELL_PADDING_Y = 16;
const MONTH_CELL_EVENT_GAP = 6;
const MONTH_EVENT_CARD_MIN_HEIGHT = 32;
const MONTH_MORE_LABEL_HEIGHT = 12;

function getMonthContentHeight(rowHeight: number) {
  return Math.max(
    rowHeight - MONTH_DAY_HEADER_HEIGHT - MONTH_CELL_PADDING_Y,
    MONTH_EVENT_CARD_MIN_HEIGHT * 2 + MONTH_CELL_EVENT_GAP,
  );
}

export function getMonthVisibleEventLimit(rowHeight: number, totalEvents: number) {
  if (totalEvents === 0) return 0;

  const availableHeight = getMonthContentHeight(rowHeight);
  let visibleCount = Math.max(
    2,
    Math.floor(
      (availableHeight + MONTH_CELL_EVENT_GAP) /
        (MONTH_EVENT_CARD_MIN_HEIGHT + MONTH_CELL_EVENT_GAP),
    ),
  );

  visibleCount = Math.min(visibleCount, totalEvents);

  while (visibleCount > 2 && visibleCount < totalEvents) {
    const contentHeight =
      visibleCount * MONTH_EVENT_CARD_MIN_HEIGHT +
      Math.max(visibleCount - 1, 0) * MONTH_CELL_EVENT_GAP +
      MONTH_CELL_EVENT_GAP +
      MONTH_MORE_LABEL_HEIGHT;

    if (contentHeight <= availableHeight) break;

    visibleCount -= 1;
  }

  return visibleCount;
}

export function canShowMonthOverflowLabel(rowHeight: number, visibleCount: number) {
  if (visibleCount === 0) return false;

  const availableHeight = getMonthContentHeight(rowHeight);
  const requiredHeight =
    visibleCount * MONTH_EVENT_CARD_MIN_HEIGHT +
    Math.max(visibleCount - 1, 0) * MONTH_CELL_EVENT_GAP +
    MONTH_CELL_EVENT_GAP +
    MONTH_MORE_LABEL_HEIGHT;

  return requiredHeight <= availableHeight;
}
