import type { LuckyGridRaw } from "@luckygrid/core";
import sheetCellRaw from "../../../../fixtures/lucky/sheet-cell.json";
import sheetFormulaRaw from "../../../../fixtures/lucky/sheet-formula.json";
import sheetConditionFormatRaw from "../../../../fixtures/lucky/sheet-condition-format.json";
import sheetSparklineRaw from "../../../../fixtures/lucky/sheet-sparkline.json";
import sheetTableRaw from "../../../../fixtures/lucky/sheet-table.json";
import sheetCommentRaw from "../../../../fixtures/lucky/sheet-comment.json";
import sheetPivotTableDataRaw from "../../../../fixtures/lucky/sheet-pivot-table-data.json";
import sheetPivotTableRaw from "../../../../fixtures/lucky/sheet-pivot-table.json";
import sheetChartRaw from "../../../../fixtures/lucky/sheet-chart.json";
import sheetPictureRaw from "../../../../fixtures/lucky/sheet-picture.json";
import sheetDataVerificationRaw from "../../../../fixtures/lucky/sheet-data-verification.json";

/**
 * 原版 LuckysheetDemo `create().data` 顺序（与 index.html 一致）：
 * Cell, Formula, Conditional Format, Sparkline, Table, Comment,
 * PivotTableData, PivotTable, Chart, Picture, Data Verification
 */
const DEMO_SHEET_RAW = [
  sheetCellRaw,
  sheetFormulaRaw,
  sheetConditionFormatRaw,
  sheetSparklineRaw,
  sheetTableRaw,
  sheetCommentRaw,
  sheetPivotTableDataRaw,
  sheetPivotTableRaw,
  sheetChartRaw,
  sheetPictureRaw,
  sheetDataVerificationRaw,
] as LuckyGridRaw[];

function sanitizeSheet(raw: LuckyGridRaw): LuckyGridRaw {
  const sheet = structuredClone(raw) as LuckyGridRaw;
  for (const item of sheet.celldata ?? []) {
    const v = item.v as Record<string, unknown> | null | undefined;
    if (v && typeof v === "object" && "customKey" in v) {
      delete v.customKey;
    }
  }
  return sheet;
}

/** 对比页：加载 Demo 全部 sheet（未实现能力保留在 extras，不强行模拟） */
export function demoSheetsForCompare(): LuckyGridRaw[] {
  return DEMO_SHEET_RAW.map(sanitizeSheet);
}

/** @deprecated 使用 demoSheetsForCompare；保留别名以免旧引用断裂 */
export function cellSheetForCompare(): LuckyGridRaw[] {
  return demoSheetsForCompare();
}

/** 对比时右侧预期无法 1:1 还原的能力（便于肉眼找差距） */
export const DEMO_SHEET_KNOWN_GAPS = [
  "条件格式、交替颜色、Sparkline（扩展字段保留但不渲染）",
  "图片、图表、透视表、数据验证 UI",
  "部分公式函数与原版完整函数表仍有差距",
] as const;

/** @deprecated 使用 DEMO_SHEET_KNOWN_GAPS */
export const CELL_SHEET_KNOWN_GAPS = DEMO_SHEET_KNOWN_GAPS;
