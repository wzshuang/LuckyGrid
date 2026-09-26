/** Luckysheet keeps a 20px gap between the cell and the viewport edge. */
export const SCROLL_REVEAL_MARGIN = 20;

export type ScrollRevealInput = {
  scrollLeft: number;
  scrollTop: number;
  /** Cell area size, excluding row/column headers. */
  viewWidth: number;
  viewHeight: number;
  cellLeft: number;
  cellRight: number;
  cellTop: number;
  cellBottom: number;
  /** Frozen pane size in content pixels. Cells inside it are already visible. */
  freezeWidth?: number;
  freezeHeight?: number;
};

/**
 * Scroll so a cell stays inside the viewport, matching
 * `luckysheetMoveHighlightCell` in Luckysheet `sheetMove.js`.
 */
export function scrollToRevealCell(input: ScrollRevealInput): {
  scrollLeft: number;
  scrollTop: number;
} {
  return {
    scrollLeft: revealAxis(
      input.scrollLeft,
      input.viewWidth,
      input.cellLeft,
      input.cellRight,
      input.freezeWidth ?? 0,
    ),
    scrollTop: revealAxis(
      input.scrollTop,
      input.viewHeight,
      input.cellTop,
      input.cellBottom,
      input.freezeHeight ?? 0,
    ),
  };
}

function revealAxis(
  scroll: number,
  viewSize: number,
  start: number,
  end: number,
  frozen: number,
): number {
  if (viewSize <= 0 || end <= frozen) return scroll;
  const margin = SCROLL_REVEAL_MARGIN;
  if (end - scroll - viewSize + margin > 0) {
    return Math.max(0, end - viewSize + margin);
  }
  if (start - scroll - frozen - margin < 0) {
    return Math.max(0, start - frozen - margin);
  }
  return scroll;
}
