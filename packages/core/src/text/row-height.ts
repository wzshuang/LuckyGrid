import { displayValue } from "../model/cell.js";
import { DEFAULT_ROW_LEN, type Sheet } from "../model/sheet.js";
import { cellCanvasFont } from "./font.js";
import { layoutCellText } from "./text-layout.js";
import { normalizeTb } from "./tb-tr.js";
import type { MeasureTextFn } from "./types.js";

function mergeCellWidth(sheet: Sheet, row: number, col: number): number {
  const merge = sheet.getMergeAt(row, col);
  if (merge != null && merge.r === row && merge.c === col) {
    let w = 0;
    for (let c = merge.c; c < merge.c + merge.cs; c++) {
      w += sheet.getColWidth(c);
    }
    return w;
  }
  return sheet.getColWidth(col);
}

function mergeCellHeight(sheet: Sheet, row: number, col: number): number {
  const merge = sheet.getMergeAt(row, col);
  if (merge != null && merge.r === row && merge.c === col) {
    let h = 0;
    for (let r = merge.r; r < merge.r + merge.rs; r++) {
      h += sheet.getRowHeight(r);
    }
    return h;
  }
  return sheet.getRowHeight(row);
}

export function measureRowHeight(
  sheet: Sheet,
  row: number,
  measureText: MeasureTextFn,
): number {
  const paddingY = 2;
  let maxContent = 0;

  for (let col = 0; col < sheet.colCount; col++) {
    if (sheet.isMergeCovered(row, col)) continue;
    const cell = sheet.getCell(row, col);
    const text = cell != null ? displayValue(cell) : "";
    const tb = normalizeTb(cell?.tb);
    if (text === "" && tb !== 2) continue;

    const layout = layoutCellText({
      text,
      cellWidth: mergeCellWidth(sheet, row, col),
      cellHeight: mergeCellHeight(sheet, row, col),
      tb: cell?.tb,
      tr: cell?.tr,
      ht: cell?.ht,
      vt: cell?.vt,
      font: cellCanvasFont(cell),
      measureText,
    });
    maxContent = Math.max(maxContent, layout.contentHeight);
  }

  return Math.max(DEFAULT_ROW_LEN, maxContent + 2 * paddingY);
}

export function recalcRowHeights(
  sheet: Sheet,
  rows: Iterable<number>,
  measureText: MeasureTextFn,
): void {
  for (const row of rows) {
    sheet.setRowHeight(row, measureRowHeight(sheet, row, measureText));
  }
}
