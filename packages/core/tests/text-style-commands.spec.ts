import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";
import { DEFAULT_ROW_LEN } from "../src/model/sheet.js";
import { applyFormat, stripValue } from "../src/clipboard/style.js";

const measure = (text: string) => ({ width: text.length * 10, height: 12 });

describe("text style commands", () => {
  it("applyStyleToSelection writes tb/tr", () => {
    const eng = new WorkbookEngine();
    eng.setMeasureText(measure);
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 0] }],
    });
    eng.applyStyleToSelection({ tb: 2, tr: 1 });
    const cell = eng.workbook.getCell(0, 0);
    expect(cell?.tb).toBe(2);
    expect(cell?.tr).toBe(1);
  });

  it("wrap style raises row height and undoes in one step", () => {
    const eng = new WorkbookEngine();
    eng.setMeasureText(measure);
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "abcdefghijklmnop" });
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 0] }],
    });
    const before = eng.workbook.getActiveSheet().getRowHeight(0);
    eng.applyStyleToSelection({ tb: 2 });
    expect(eng.workbook.getActiveSheet().getRowHeight(0)).toBeGreaterThan(before);
    eng.undo();
    expect(eng.workbook.getCell(0, 0)?.tb).toBeUndefined();
    expect(eng.workbook.getActiveSheet().getRowHeight(0)).toBe(before);
  });

  it("edit commit recalculates wrap row height", () => {
    const eng = new WorkbookEngine();
    eng.setMeasureText(measure);
    eng.execute({ type: "setStyle", row: 0, col: 0, style: { tb: 2 } });
    eng.execute({
      type: "setCellValue",
      row: 0,
      col: 0,
      value: "abcdefghijklmnop",
    });
    expect(eng.workbook.getActiveSheet().getRowHeight(0)).toBeGreaterThan(DEFAULT_ROW_LEN);
    eng.undo();
    expect(eng.workbook.getActiveSheet().getRowHeight(0)).toBe(DEFAULT_ROW_LEN);
  });

  it("paint format copies tb/tr", () => {
    const fmt = stripValue({ v: 1, tb: 2, tr: 4 } as never);
    const next = applyFormat({ v: "x" }, fmt);
    expect(next?.tb).toBe(2);
    expect(next?.tr).toBe(4);
  });
});
