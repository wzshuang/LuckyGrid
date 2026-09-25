import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";
import { scanOverflowSpan } from "../src/text/overflow.js";
import { measureRowHeight, recalcRowHeights } from "../src/text/row-height.js";
import { DEFAULT_ROW_LEN } from "../src/model/sheet.js";

const measure = (text: string) => ({ width: text.length * 10, height: 12 });

describe("scanOverflowSpan", () => {
  it("extends through empty cells and stops at content", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "long" });
    eng.execute({ type: "setCellValue", row: 0, col: 3, value: "x" });
    const sheet = eng.workbook.getActiveSheet();
    expect(scanOverflowSpan(sheet, 0, 0)).toEqual({ startCol: 0, endCol: 2 });
  });
});

describe("measureRowHeight", () => {
  it("grows for wrapped text", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setStyle",
      row: 0,
      col: 0,
      style: { tb: 2, fs: 10 },
    });
    eng.execute({
      type: "setCellValue",
      row: 0,
      col: 0,
      value: "abcdefghijklmnop",
    });
    const h = measureRowHeight(eng.workbook.getActiveSheet(), 0, measure);
    expect(h).toBeGreaterThan(DEFAULT_ROW_LEN);
  });

  it("recalcRowHeights writes config.rowlen", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setCellValue",
      row: 1,
      col: 0,
      value: "abcdefghijklmnop",
    });
    eng.execute({ type: "setStyle", row: 1, col: 0, style: { tb: 2 } });
    recalcRowHeights(eng.workbook.getActiveSheet(), [1], measure);
    expect(eng.workbook.getActiveSheet().getRowHeight(1)).toBeGreaterThan(DEFAULT_ROW_LEN);
  });
});
