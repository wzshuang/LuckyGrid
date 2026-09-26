import type { LuckyGridRaw } from "@luckygrid/core";
import sheetCellRaw from "../../../../fixtures/lucky/sheet-cell.json";

/**
 * 原版 LuckysheetDemo `demoData/sheetCell.js` 导出为 JSON，供对比页直接 load。
 * 仅去掉引擎不认识的字段；borderInfo 在 Sheet 加载时展开为 cell.bd。
 */
export function cellSheetForCompare(): LuckyGridRaw[] {
  const sheet = structuredClone(sheetCellRaw) as LuckyGridRaw;
  for (const item of sheet.celldata ?? []) {
    const v = item.v as Record<string, unknown> | null | undefined;
    if (v && typeof v === "object" && "customKey" in v) {
      delete v.customKey;
    }
  }
  return [sheet];
}

/** 对比时右侧预期无法 1:1 还原的能力（便于肉眼找差距） */
export const CELL_SHEET_KNOWN_GAPS = [
  "跨工作表引用（如 =Formula!D3+Formula!D4，未加载 Formula 页）",
  "条件格式、数据验证、批注、图片等 sheet 扩展字段",
] as const;
