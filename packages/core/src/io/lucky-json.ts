import type { SheetSnapshot } from "../model/sheet.js";
import type { CellData } from "../model/cell.js";

/** Raw Luckysheet sheet object (subset + extras) */
export type LuckyGridRaw = {
  name?: string;
  index?: string | number;
  order?: number | string;
  status?: number | string;
  celldata?: Array<{ r: number; c: number; v: CellData | null }>;
  data?: Array<Array<CellData | null>>;
  config?: Record<string, unknown>;
  row?: number;
  column?: number;
  [key: string]: unknown;
};

const KNOWN = new Set([
  "name",
  "index",
  "order",
  "status",
  "celldata",
  "data",
  "config",
  "row",
  "column",
]);

/** Luckysheet sheet-level `frozen` → internal `config.freeze` counts */
export type LuckyFrozen = {
  type?: string;
  range?: {
    row_focus?: number;
    column_focus?: number;
    [key: string]: unknown;
  };
};

/**
 * Map Luckysheet `frozen` (e.g. `{ type: "row" }`) to `{ row, col }` freeze counts.
 * Returns null when there is no freeze / cancel / unknown.
 */
export function frozenToFreeze(
  frozen: LuckyFrozen | null | undefined,
): { row: number; col: number } | null {
  if (!frozen || typeof frozen !== "object") return null;
  const type = frozen.type;
  if (!type || type === "cancel") return null;

  const rowFocus = Number(frozen.range?.row_focus ?? 0);
  const colFocus = Number(frozen.range?.column_focus ?? 0);

  switch (type) {
    case "row":
      return { row: 1, col: 0 };
    case "column":
      return { row: 0, col: 1 };
    case "both":
      return { row: 1, col: 1 };
    case "rangeRow":
      return { row: Math.max(0, rowFocus + 1), col: 0 };
    case "rangeColumn":
      return { row: 0, col: Math.max(0, colFocus + 1) };
    case "rangeBoth":
      return {
        row: Math.max(0, rowFocus + 1),
        col: Math.max(0, colFocus + 1),
      };
    default:
      return null;
  }
}

export function fromLuckyFile(raw: LuckyGridRaw[] | LuckyGridRaw): SheetSnapshot[] {
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((sheet, i) => {
    const extras: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sheet)) {
      if (!KNOWN.has(k)) extras[k] = v;
    }

    let celldata =
      sheet.celldata
        ?.filter((c) => c && c.v != null)
        .map((c) => ({ r: c.r, c: c.c, v: c.v as CellData })) ?? [];

    if ((!celldata.length || celldata.length === 0) && Array.isArray(sheet.data)) {
      celldata = [];
      for (let r = 0; r < sheet.data.length; r++) {
        const row = sheet.data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (v != null) celldata.push({ r, c, v });
        }
      }
    }

    const config = { ...(sheet.config ?? {}) } as SheetSnapshot["config"];

    // Prefer explicit config.freeze; otherwise map Luckysheet `frozen`.
    const existing = config.freeze;
    const hasFreeze =
      existing &&
      typeof existing === "object" &&
      (Number((existing as { row?: number }).row) > 0 ||
        Number((existing as { col?: number }).col) > 0);
    if (!hasFreeze) {
      const mapped = frozenToFreeze(sheet.frozen as LuckyFrozen | undefined);
      if (mapped) config.freeze = mapped;
    }

    return {
      name: sheet.name ?? `Sheet${i + 1}`,
      index: sheet.index ?? i,
      order: Number(sheet.order ?? i),
      status: Number(sheet.status ?? (i === 0 ? 1 : 0)),
      celldata,
      config,
      row: sheet.row,
      column: sheet.column,
      extras,
    };
  });
}

export function toLuckyFile(snapshots: SheetSnapshot[]): LuckyGridRaw[] {
  return snapshots.map((s) => {
    const out: LuckyGridRaw = {
      name: s.name,
      index: s.index,
      order: s.order,
      status: s.status,
      celldata: s.celldata,
      config: s.config,
      row: s.row,
      column: s.column,
      ...(s.extras ?? {}),
    };
    return out;
  });
}
