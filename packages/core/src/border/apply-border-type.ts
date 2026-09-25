import type { BorderSide, CellBorder, CellData } from "../model/cell.js";
import { cloneCell } from "../model/cell.js";
import type { Sheet } from "../model/sheet.js";
import type { SelectionRange } from "../model/workbook.js";
import type { BorderInfoEntry, BorderType } from "./types.js";

function side(color: string, style: number): BorderSide {
  return { style, color };
}

function normalizeRange(range: SelectionRange) {
  return {
    r0: Math.min(range.row[0], range.row[1]),
    r1: Math.max(range.row[0], range.row[1]),
    c0: Math.min(range.column[0], range.column[1]),
    c1: Math.max(range.column[0], range.column[1]),
  };
}

function ensureCell(sheet: Sheet, row: number, col: number): CellData {
  return cloneCell(sheet.getCell(row, col)) ?? {};
}

function setBd(sheet: Sheet, row: number, col: number, bd: CellBorder | null): void {
  const cell = ensureCell(sheet, row, col);
  if (bd == null) {
    delete cell.bd;
    sheet.setCell(row, col, Object.keys(cell).length ? cell : null);
    return;
  }
  cell.bd = bd;
  sheet.setCell(row, col, cell);
}

function mergeBd(
  existing: CellBorder | null | undefined,
  patch: CellBorder,
): CellBorder {
  return { ...(existing ?? {}), ...patch };
}

function patchSide(
  sheet: Sheet,
  row: number,
  col: number,
  key: keyof CellBorder,
  value: BorderSide,
): void {
  const cell = ensureCell(sheet, row, col);
  setBd(sheet, row, col, mergeBd(cell.bd, { [key]: value }));
}

function clearSide(
  sheet: Sheet,
  row: number,
  col: number,
  key: keyof CellBorder,
): void {
  const cell = sheet.getCell(row, col);
  if (!cell?.bd?.[key]) return;
  const bd: CellBorder = { ...cell.bd };
  delete bd[key];
  setBd(sheet, row, col, Object.keys(bd).length ? bd : null);
}

function appendBorderInfo(
  sheet: Sheet,
  borderType: BorderType,
  color: string,
  style: number,
  r0: number,
  r1: number,
  c0: number,
  c1: number,
): void {
  const entry: BorderInfoEntry = {
    rangeType: "range",
    borderType,
    color,
    style,
    range: [{ row: [r0, r1], column: [c0, c1] }],
  };
  const list = Array.isArray(sheet.config.borderInfo)
    ? ([...(sheet.config.borderInfo as BorderInfoEntry[])] as BorderInfoEntry[])
    : [];
  list.push(entry);
  sheet.config.borderInfo = list;
}

function applyAllOnCell(
  sheet: Sheet,
  row: number,
  col: number,
  s: BorderSide,
): void {
  const merge = sheet.getMergeAt(row, col);
  if (merge) {
    const patch: CellBorder = {};
    if (row === merge.r) patch.t = s;
    if (row === merge.r + merge.rs - 1) patch.b = s;
    if (col === merge.c) patch.l = s;
    if (col === merge.c + merge.cs - 1) patch.r = s;
    if (Object.keys(patch).length === 0) return;
    const cell = ensureCell(sheet, row, col);
    setBd(sheet, row, col, mergeBd(cell.bd, patch));
    return;
  }
  setBd(sheet, row, col, { t: s, b: s, l: s, r: s });
}

/** Apply borders to selection; also records config.borderInfo unless recordInfo is false */
export function applyBorderType(
  sheet: Sheet,
  range: SelectionRange,
  borderType: BorderType,
  color = "#000000",
  style = 1,
  options?: { recordInfo?: boolean },
): void {
  const { r0, r1, c0, c1 } = normalizeRange(range);
  const s = side(color, Number(style) || 1);

  if (borderType === "border-none") {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        setBd(sheet, r, c, null);
      }
    }
    // Clear neighbor opposite edges along the selection perimeter (Lucky border-none)
    for (let c = c0; c <= c1; c++) {
      if (r0 > 0) clearSide(sheet, r0 - 1, c, "b");
      clearSide(sheet, r1 + 1, c, "t");
    }
    for (let r = r0; r <= r1; r++) {
      if (c0 > 0) clearSide(sheet, r, c0 - 1, "r");
      clearSide(sheet, r, c1 + 1, "l");
    }
  } else if (borderType === "border-all") {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        applyAllOnCell(sheet, r, c, s);
      }
    }
  } else if (borderType === "border-outside") {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const patch: CellBorder = {};
        if (r === r0) patch.t = s;
        if (r === r1) patch.b = s;
        if (c === c0) patch.l = s;
        if (c === c1) patch.r = s;
        if (Object.keys(patch).length === 0) continue;
        const cell = ensureCell(sheet, r, c);
        setBd(sheet, r, c, mergeBd(cell.bd, patch));
      }
    }
  } else if (borderType === "border-top") {
    for (let c = c0; c <= c1; c++) {
      patchSide(sheet, r0, c, "t", s);
      if (r0 > 0) patchSide(sheet, r0 - 1, c, "b", s);
    }
  } else if (borderType === "border-bottom") {
    for (let c = c0; c <= c1; c++) {
      patchSide(sheet, r1, c, "b", s);
      patchSide(sheet, r1 + 1, c, "t", s);
    }
  } else if (borderType === "border-left") {
    for (let r = r0; r <= r1; r++) {
      patchSide(sheet, r, c0, "l", s);
      if (c0 > 0) patchSide(sheet, r, c0 - 1, "r", s);
    }
  } else if (borderType === "border-right") {
    for (let r = r0; r <= r1; r++) {
      patchSide(sheet, r, c1, "r", s);
      patchSide(sheet, r, c1 + 1, "l", s);
    }
  } else if (borderType === "border-inside") {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const patch: CellBorder = {};
        if (c < c1) patch.r = s;
        if (c > c0) patch.l = s;
        if (r < r1) patch.b = s;
        if (r > r0) patch.t = s;
        const cell = ensureCell(sheet, r, c);
        setBd(sheet, r, c, mergeBd(cell.bd, patch));
      }
    }
  } else if (borderType === "border-horizontal") {
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c <= c1; c++) {
        patchSide(sheet, r, c, "b", s);
        patchSide(sheet, r + 1, c, "t", s);
      }
    }
  } else if (borderType === "border-vertical") {
    for (let c = c0; c < c1; c++) {
      for (let r = r0; r <= r1; r++) {
        patchSide(sheet, r, c, "r", s);
        patchSide(sheet, r, c + 1, "l", s);
      }
    }
  }

  if (options?.recordInfo !== false) {
    appendBorderInfo(sheet, borderType, color, style, r0, r1, c0, c1);
  }
}
