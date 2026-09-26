/**
 * Cell value fields aligned with Luckysheet protocol.
 * Unknown fields from JSON live in `extras`.
 */
export type BorderSide = {
  /** 1 thin, 2 medium */
  style: number;
  color: string;
};

/** Per-cell border (Lucky-compatible `bd`) */
export type CellBorder = {
  t?: BorderSide;
  b?: BorderSide;
  l?: BorderSide;
  r?: BorderSide;
};

export interface CellStyle {
  /** background */
  bg?: string | null;
  /** font color */
  fc?: string | null;
  /** bold 0|1 */
  bl?: number;
  /** italic 0|1 */
  it?: number;
  /** strikethrough 0|1 */
  cl?: number;
  /** underline 0|1 */
  un?: number;
  /** font size */
  fs?: number;
  /** font family index / name */
  ff?: number | string;
  /** horizontal align: 0 center, 1 left, 2 right */
  ht?: number;
  /** vertical align: 0 middle, 1 top, 2 bottom */
  vt?: number;
  /** text wrap: 0 clip, 1 overflow, 2 wrap */
  tb?: number;
  /** text rotate: 0 none … 5 rotation-down */
  tr?: number;
  /** borders */
  bd?: CellBorder | null;
}

/** Lucky inlineStr run (`ct.t === "inlineStr"` → `ct.s`) */
export type InlineStrRun = {
  v?: string | null;
  [key: string]: unknown;
};

export interface CellType {
  /** format string e.g. General */
  fa?: string;
  /** type: n number, s string, d date, b bool, inlineStr, etc. */
  t?: string;
  /** rich-text runs when t is inlineStr */
  s?: InlineStrRun[];
}

export interface CellData extends CellStyle {
  /** raw value */
  v?: string | number | boolean | null;
  /** display string */
  m?: string | null;
  /** formula string starting with = */
  f?: string | null;
  /** cell type / format */
  ct?: CellType | null;
  /** passthrough unknown fields from Lucky JSON */
  extras?: Record<string, unknown>;
}

export type Cell = CellData | null | undefined;

export function cloneCell(cell: Cell): CellData | null {
  if (cell == null) return null;
  return {
    ...cell,
    ct: cell.ct
      ? {
          ...cell.ct,
          s: cell.ct.s ? cell.ct.s.map((run) => ({ ...run })) : cell.ct.s,
        }
      : cell.ct,
    bd: cell.bd
      ? {
          t: cell.bd.t ? { ...cell.bd.t } : undefined,
          b: cell.bd.b ? { ...cell.bd.b } : undefined,
          l: cell.bd.l ? { ...cell.bd.l } : undefined,
          r: cell.bd.r ? { ...cell.bd.r } : undefined,
        }
      : cell.bd,
    extras: cell.extras ? { ...cell.extras } : cell.extras,
  };
}

function inlineStrText(cell: CellData): string {
  const runs = cell.ct?.s;
  if (!Array.isArray(runs) || runs.length === 0) return "";
  return runs.map((run) => (run?.v != null ? String(run.v) : "")).join("");
}

/** Drop value, display text, formula, and inline rich text. Keep style and number format. */
export function clearCellContent(cell: Cell): CellData | null {
  if (cell == null) return null;
  const next = cloneCell(cell)!;
  delete next.v;
  delete next.m;
  delete next.f;
  if (next.ct?.t === "inlineStr") delete next.ct;
  if (!hasRemainingCellData(next)) return null;
  return next;
}

function hasRemainingCellData(cell: CellData): boolean {
  for (const [key, value] of Object.entries(cell)) {
    if (value == null) continue;
    if (key === "extras" && typeof value === "object" && Object.keys(value).length === 0) {
      continue;
    }
    return true;
  }
  return false;
}

export function displayValue(cell: Cell): string {
  if (cell == null) return "";
  if (cell.m != null && cell.m !== "") return String(cell.m);
  if (cell.v != null && cell.v !== "") return String(cell.v);
  const inline = inlineStrText(cell);
  if (inline !== "") return inline;
  if (cell.v != null) return String(cell.v);
  return "";
}
