import type { CellPostil } from "../model/cell.js";
import {
  DEFAULT_POSTIL_HEIGHT,
  DEFAULT_POSTIL_OFFSET,
  DEFAULT_POSTIL_WIDTH,
} from "../model/cell.js";
import type { Sheet } from "../model/sheet.js";
import {
  COL_HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
  buildColOffsets,
  buildRowOffsets,
  colLeft,
  rowTop,
} from "../hit/location.js";

export type PostilLayout = {
  /** sheet content coords (A1 top-left = 0,0) */
  toX: number;
  toY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** viewport coords including headers, scroll applied */
  viewLeft: number;
  viewTop: number;
  viewToX: number;
  viewToY: number;
};

/** Content-space top-right of cell (merge-aware). */
export function cellContentAnchor(
  sheet: Sheet,
  row: number,
  col: number,
  rowOffsets?: number[],
  colOffsets?: number[],
): { toX: number; toY: number } {
  const ro = rowOffsets ?? buildRowOffsets(sheet);
  const co = colOffsets ?? buildColOffsets(sheet);
  const merge = sheet.getMergeAt(row, col);
  const r0 = merge?.r ?? row;
  const c0 = merge?.c ?? col;
  const cs = merge?.cs ?? 1;
  const left = colLeft(co, c0);
  const top = rowTop(ro, r0);
  const right = co[c0 + cs - 1] ?? left + sheet.getColWidth(c0);
  return { toX: right, toY: top };
}

export function resolvePostilBox(
  ps: CellPostil | null | undefined,
  toX: number,
  toY: number,
): { left: number; top: number; width: number; height: number } {
  const width = ps?.width == null ? DEFAULT_POSTIL_WIDTH : ps.width;
  const height = ps?.height == null ? DEFAULT_POSTIL_HEIGHT : ps.height;
  const left = ps?.left == null ? toX + DEFAULT_POSTIL_OFFSET : ps.left;
  let top = ps?.top == null ? toY - DEFAULT_POSTIL_OFFSET : ps.top;
  if (top < 0) top = 2;
  return { left, top, width, height };
}

export function getPostilLayout(
  sheet: Sheet,
  row: number,
  col: number,
  ps: CellPostil | null | undefined,
  scrollLeft: number,
  scrollTop: number,
  rowOffsets?: number[],
  colOffsets?: number[],
): PostilLayout {
  const { toX, toY } = cellContentAnchor(sheet, row, col, rowOffsets, colOffsets);
  const box = resolvePostilBox(ps, toX, toY);
  return {
    toX,
    toY,
    ...box,
    viewLeft: ROW_HEADER_WIDTH + box.left - scrollLeft,
    viewTop: COL_HEADER_HEIGHT + box.top - scrollTop,
    viewToX: ROW_HEADER_WIDTH + toX - scrollLeft,
    viewToY: COL_HEADER_HEIGHT + toY - scrollTop,
  };
}

/** Arrow canvas placement (Luckysheet getArrowCanvasSize). */
export function getArrowCanvasSize(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): [number, number, number, number, number, number, number, number] {
  let left = toX - 5;
  if (fromX < toX) left = fromX - 5;
  let top = toY - 5;
  if (fromY < toY) top = fromY - 5;
  const width = Math.abs(fromX - toX) + 10;
  const height = Math.abs(fromY - toY) + 10;
  let x1 = width - 5;
  let x2 = 5;
  if (fromX < toX) {
    x1 = 5;
    x2 = width - 5;
  }
  let y1 = height - 5;
  let y2 = 5;
  if (fromY < toY) {
    y1 = 5;
    y2 = height - 5;
  }
  return [left, top, width, height, x1, y1, x2, y2];
}

export function drawPostilArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  theta = 30,
  headlen = 6,
  width = 1,
  color = "#000",
): void {
  const angle = (Math.atan2(fromY - toY, fromX - toX) * 180) / Math.PI;
  const angle1 = ((angle + theta) * Math.PI) / 180;
  const angle2 = ((angle - theta) * Math.PI) / 180;
  const topX = headlen * Math.cos(angle1);
  const topY = headlen * Math.sin(angle1);
  const botX = headlen * Math.cos(angle2);
  const botY = headlen * Math.sin(angle2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX + topX, toY + topY);
  ctx.lineTo(toX, toY);
  ctx.lineTo(toX + botX, toY + botY);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
