import type { SelectionRange } from "../model/workbook.js";
import type { Sheet } from "../model/sheet.js";
import { applyBorderType } from "./apply-border-type.js";
import type { BorderType, BorderInfoEntry } from "./types.js";

/** @deprecated Use BorderType string literals */
export type BorderMode = "all" | "outside" | "none";

export type { BorderInfoEntry };

const LEGACY_MODE: Record<BorderMode, BorderType> = {
  all: "border-all",
  outside: "border-outside",
  none: "border-none",
};

/** @deprecated Use applyBorderType */
export function applyBorders(
  sheet: Sheet,
  range: SelectionRange,
  mode: BorderMode,
  color = "#000000",
  style = 1,
): void {
  applyBorderType(sheet, range, LEGACY_MODE[mode], color, style);
}

export { applyBorderType };
