export type BorderType =
  | "border-top"
  | "border-bottom"
  | "border-left"
  | "border-right"
  | "border-none"
  | "border-all"
  | "border-outside"
  | "border-inside"
  | "border-horizontal"
  | "border-vertical";

export type BorderInfoRangeEntry = {
  rangeType: "range";
  borderType: BorderType;
  color: string;
  style: number | string;
  range: Array<{ row: [number, number]; column: [number, number] }>;
};

export type BorderInfoCellSide = { style: number | string; color: string } | null;

export type BorderInfoCellEntry = {
  rangeType: "cell";
  value: {
    row_index: number;
    col_index: number;
    l?: BorderInfoCellSide;
    r?: BorderInfoCellSide;
    t?: BorderInfoCellSide;
    b?: BorderInfoCellSide;
  };
};

export type BorderInfoEntry = BorderInfoRangeEntry | BorderInfoCellEntry;

/** Lucky toolbar border line styles (style 1–13). */
export const BORDER_LINE_STYLES: ReadonlyArray<{ value: number; key: string }> = [
  { value: 1, key: "Thin" },
  { value: 2, key: "Hair" },
  { value: 3, key: "Dotted" },
  { value: 4, key: "DashDot" },
  { value: 5, key: "DashDotDot" },
  { value: 6, key: "SlantDashDot" },
  { value: 7, key: "Double" },
  { value: 8, key: "Medium" },
  { value: 9, key: "MediumDashed" },
  { value: 10, key: "MediumDashDot" },
  { value: 11, key: "MediumDashDotDot" },
  { value: 12, key: "SlantDashDot" },
  { value: 13, key: "Thick" },
];
