import { displayValue } from "../model/cell.js";
import type { Sheet } from "../model/sheet.js";

function isEmptyForOverflowScan(sheet: Sheet, row: number, col: number): boolean {
  if (col < 0 || col >= sheet.colCount) return false;
  if (sheet.isMergeCovered(row, col)) return false;
  const cell = sheet.getCell(row, col);
  if (cell != null && displayValue(cell) !== "") return false;
  const merge = sheet.getMergeAt(row, col);
  if (merge != null && merge.r === row && merge.c === col) return false;
  return true;
}

export function scanOverflowSpan(
  sheet: Sheet,
  row: number,
  col: number,
): { startCol: number; endCol: number } {
  const startCol = col;
  let endCol = col;

  const mergeAtStart = sheet.getMergeAt(row, col);
  let scanCol: number;
  if (mergeAtStart != null && mergeAtStart.r === row && mergeAtStart.c === col) {
    endCol = col + mergeAtStart.cs - 1;
    scanCol = col + mergeAtStart.cs;
  } else {
    scanCol = col + 1;
  }

  while (scanCol < sheet.colCount && isEmptyForOverflowScan(sheet, row, scanCol)) {
    endCol = scanCol;
    scanCol++;
  }

  return { startCol, endCol };
}
