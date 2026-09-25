import type { BorderSide, CellBorder, CellData } from "../model/cell.js";
import { cloneCell } from "../model/cell.js";
import type { MergeRange, Sheet } from "../model/sheet.js";
import type { SelectionRange } from "../model/workbook.js";
import { applyBorderType } from "./apply-border-type.js";
import type {
  BorderInfoCellEntry,
  BorderInfoEntry,
  BorderInfoRangeEntry,
  BorderType,
} from "./types.js";

export function borderKey(row: number, col: number): string {
  return `${row}_${col}`;
}

function toSide(raw: { style: number | string; color: string }): BorderSide {
  return { style: Number(raw.style) || 1, color: raw.color || "#000000" };
}

/** Duck-typed sheet used only to replay borderInfo range entries into memory. */
function createBorderScratch(source: Sheet): Sheet {
  const cells = new Map<string, CellData>();
  const merge = source.config.merge ? { ...source.config.merge } : undefined;
  const scratch = {
    name: source.name,
    index: source.index,
    order: source.order,
    status: source.status,
    config: { merge } as Sheet["config"],
    rowCount: source.rowCount,
    colCount: source.colCount,
    extras: {},
    hiddenRows: new Set<number>(),
    getCell(row: number, col: number) {
      return cells.get(borderKey(row, col)) ?? null;
    },
    setCell(row: number, col: number, cell: CellData | null) {
      const key = borderKey(row, col);
      if (cell == null) cells.delete(key);
      else cells.set(key, cloneCell(cell)!);
    },
    forEachCell(fn: (row: number, col: number, cell: CellData) => void) {
      for (const [key, cell] of cells) {
        const [rs, cs] = key.split("_");
        fn(Number(rs), Number(cs), cell);
      }
    },
    getMergeAt(row: number, col: number): MergeRange | null {
      if (!merge) return null;
      for (const m of Object.values(merge)) {
        if (row >= m.r && row < m.r + m.rs && col >= m.c && col < m.c + m.cs) {
          return m;
        }
      }
      return null;
    },
  };
  return scratch as unknown as Sheet;
}

function applyCellEntry(sheet: Sheet, entry: BorderInfoCellEntry): void {
  const { row_index: row, col_index: col } = entry.value;
  if (!Number.isFinite(row) || !Number.isFinite(col)) return;
  const value = entry.value;
  const next: CellBorder = { ...(sheet.getCell(row, col)?.bd ?? {}) };
  for (const key of ["l", "r", "t", "b"] as const) {
    const side = value[key];
    if (side != null) next[key] = toSide(side);
    else delete next[key];
  }
  const cell = cloneCell(sheet.getCell(row, col)) ?? {};
  if (Object.keys(next).length === 0) delete cell.bd;
  else cell.bd = next;
  sheet.setCell(row, col, Object.keys(cell).length ? cell : null);
}

function applyRangeEntry(sheet: Sheet, entry: BorderInfoRangeEntry): void {
  const style = Number(entry.style) || 1;
  const color = entry.color || "#000000";
  for (const rng of entry.range ?? []) {
    if (!rng?.row || !rng?.column) continue;
    applyBorderType(
      sheet,
      { row: rng.row, column: rng.column } as SelectionRange,
      entry.borderType as BorderType,
      color,
      style,
      { recordInfo: false },
    );
  }
}

function replayBorderInfo(target: Sheet, list: BorderInfoEntry[]): void {
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    if (raw.rangeType === "cell") applyCellEntry(target, raw);
    else if (raw.rangeType === "range") applyRangeEntry(target, raw);
  }
}

/** Lucky getBorderInfoCompute equivalent → Map keyed by `r_c`. */
export function computeBorderInfoMap(sheet: Sheet): Map<string, CellBorder> {
  const map = new Map<string, CellBorder>();
  const list = sheet.config.borderInfo;
  if (!Array.isArray(list) || list.length === 0) return map;

  const scratch = createBorderScratch(sheet);
  replayBorderInfo(scratch, list as BorderInfoEntry[]);
  scratch.forEachCell((r, c, cell) => {
    if (cell.bd && Object.keys(cell.bd).length) {
      map.set(borderKey(r, c), {
        t: cell.bd.t ? { ...cell.bd.t } : undefined,
        b: cell.bd.b ? { ...cell.bd.b } : undefined,
        l: cell.bd.l ? { ...cell.bd.l } : undefined,
        r: cell.bd.r ? { ...cell.bd.r } : undefined,
      });
    }
  });
  return map;
}

/** Write computed borders onto cell.bd (clipboard / format brush / fallback paint). */
export function materializeBorderInfo(sheet: Sheet): void {
  const list = sheet.config.borderInfo;
  if (!Array.isArray(list) || list.length === 0) return;

  const map = computeBorderInfoMap(sheet);
  sheet.forEachCell((r, c, cell) => {
    if (!cell.bd) return;
    const next = cloneCell(cell)!;
    delete next.bd;
    sheet.setCell(r, c, Object.keys(next).length ? next : null);
  });
  for (const [key, bd] of map) {
    const [rs, cs] = key.split("_");
    const r = Number(rs);
    const c = Number(cs);
    const cell = cloneCell(sheet.getCell(r, c)) ?? {};
    cell.bd = bd;
    sheet.setCell(r, c, cell);
  }
}

/** Resolve border for paint: prefer live borderInfo compute, else cell.bd. */
export function resolvePaintBorder(
  sheet: Sheet,
  row: number,
  col: number,
  computed: Map<string, CellBorder> | null,
): CellBorder | null {
  if (computed && computed.size >= 0 && Array.isArray(sheet.config.borderInfo) && sheet.config.borderInfo.length) {
    return computed.get(borderKey(row, col)) ?? null;
  }
  return sheet.getCell(row, col)?.bd ?? null;
}

/**
 * Shift borderInfo after inserting `count` rows at `index` (Lucky lefttop).
 * Copies cell-type borders from the template row onto new rows.
 */
export function shiftBorderInfoRows(sheet: Sheet, index: number, count: number): void {
  if (count === 0) return;
  const list = sheet.config.borderInfo;
  if (!Array.isArray(list) || list.length === 0) return;

  if (count > 0) {
    const next: BorderInfoEntry[] = [];
    const cellTemplates: BorderInfoCellEntry[] = [];
    for (const raw of list as BorderInfoEntry[]) {
      if (!raw || typeof raw !== "object") continue;
      if (raw.rangeType === "range") {
        const emptyRange: BorderInfoRangeEntry["range"] = [];
        for (const rng of raw.range ?? []) {
          let r1 = rng.row[0];
          let r2 = rng.row[1];
          if (index <= r1) {
            r1 += count;
            r2 += count;
          } else if (index <= r2) {
            r2 += count;
          }
          if (r2 >= r1) emptyRange.push({ row: [r1, r2], column: rng.column });
        }
        if (emptyRange.length) next.push({ ...raw, range: emptyRange });
      } else if (raw.rangeType === "cell") {
        const entry = structuredClone(raw) as BorderInfoCellEntry;
        if (entry.value.row_index === index) cellTemplates.push(structuredClone(entry));
        if (index <= entry.value.row_index) entry.value.row_index += count;
        next.push(entry);
      }
    }
    for (let r = 0; r < count; r++) {
      for (const tpl of cellTemplates) {
        const copy = structuredClone(tpl);
        copy.value.row_index = index + r;
        next.push(copy);
      }
    }
    sheet.config.borderInfo = next;
  } else {
    const rem = -count;
    const st = index;
    const ed = index + rem - 1;
    const next: BorderInfoEntry[] = [];
    for (const raw of list as BorderInfoEntry[]) {
      if (!raw || typeof raw !== "object") continue;
      if (raw.rangeType === "range") {
        const emptyRange: BorderInfoRangeEntry["range"] = [];
        for (const rng of raw.range ?? []) {
          let r1 = rng.row[0];
          let r2 = rng.row[1];
          for (let r = st; r <= ed; r++) {
            if (r < rng.row[0]) {
              r1 -= 1;
              r2 -= 1;
            } else if (r <= rng.row[1]) {
              r2 -= 1;
            }
          }
          if (r2 >= r1) emptyRange.push({ row: [r1, r2], column: rng.column });
        }
        if (emptyRange.length) next.push({ ...raw, range: emptyRange });
      } else if (raw.rangeType === "cell") {
        const rowIndex = raw.value.row_index;
        if (rowIndex < st) next.push(raw);
        else if (rowIndex > ed) {
          const entry = structuredClone(raw) as BorderInfoCellEntry;
          entry.value.row_index = rowIndex - rem;
          next.push(entry);
        }
      }
    }
    sheet.config.borderInfo = next;
  }
  materializeBorderInfo(sheet);
}

/** Shift borderInfo after inserting/deleting columns at `index`. */
export function shiftBorderInfoCols(sheet: Sheet, index: number, count: number): void {
  if (count === 0) return;
  const list = sheet.config.borderInfo;
  if (!Array.isArray(list) || list.length === 0) return;

  if (count > 0) {
    const next: BorderInfoEntry[] = [];
    const cellTemplates: BorderInfoCellEntry[] = [];
    for (const raw of list as BorderInfoEntry[]) {
      if (!raw || typeof raw !== "object") continue;
      if (raw.rangeType === "range") {
        const emptyRange: BorderInfoRangeEntry["range"] = [];
        for (const rng of raw.range ?? []) {
          let c1 = rng.column[0];
          let c2 = rng.column[1];
          if (index <= c1) {
            c1 += count;
            c2 += count;
          } else if (index <= c2) {
            c2 += count;
          }
          if (c2 >= c1) emptyRange.push({ row: rng.row, column: [c1, c2] });
        }
        if (emptyRange.length) next.push({ ...raw, range: emptyRange });
      } else if (raw.rangeType === "cell") {
        const entry = structuredClone(raw) as BorderInfoCellEntry;
        if (entry.value.col_index === index) cellTemplates.push(structuredClone(entry));
        if (index <= entry.value.col_index) entry.value.col_index += count;
        next.push(entry);
      }
    }
    for (let c = 0; c < count; c++) {
      for (const tpl of cellTemplates) {
        const copy = structuredClone(tpl);
        copy.value.col_index = index + c;
        next.push(copy);
      }
    }
    sheet.config.borderInfo = next;
  } else {
    const rem = -count;
    const st = index;
    const ed = index + rem - 1;
    const next: BorderInfoEntry[] = [];
    for (const raw of list as BorderInfoEntry[]) {
      if (!raw || typeof raw !== "object") continue;
      if (raw.rangeType === "range") {
        const emptyRange: BorderInfoRangeEntry["range"] = [];
        for (const rng of raw.range ?? []) {
          let c1 = rng.column[0];
          let c2 = rng.column[1];
          for (let c = st; c <= ed; c++) {
            if (c < rng.column[0]) {
              c1 -= 1;
              c2 -= 1;
            } else if (c <= rng.column[1]) {
              c2 -= 1;
            }
          }
          if (c2 >= c1) emptyRange.push({ row: rng.row, column: [c1, c2] });
        }
        if (emptyRange.length) next.push({ ...raw, range: emptyRange });
      } else if (raw.rangeType === "cell") {
        const colIndex = raw.value.col_index;
        if (colIndex < st) next.push(raw);
        else if (colIndex > ed) {
          const entry = structuredClone(raw) as BorderInfoCellEntry;
          entry.value.col_index = colIndex - rem;
          next.push(entry);
        }
      }
    }
    sheet.config.borderInfo = next;
  }
  materializeBorderInfo(sheet);
}
