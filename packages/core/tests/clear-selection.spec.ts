import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";

describe("clearSelectionContent", () => {
  it("clears every cell in the selection and keeps cells outside it", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "a" });
    eng.execute({ type: "setCellValue", row: 0, col: 1, value: "b" });
    eng.execute({ type: "setCellValue", row: 1, col: 0, value: "c" });
    eng.execute({ type: "setCellValue", row: 1, col: 1, value: "d" });
    eng.execute({ type: "setCellValue", row: 2, col: 0, value: "keep" });
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1], row_focus: 0, column_focus: 0 }],
    });

    eng.clearSelectionContent();

    expect(eng.getCellValue(0, 0)).toBeNull();
    expect(eng.getCellValue(0, 1)).toBeNull();
    expect(eng.getCellValue(1, 0)).toBeNull();
    expect(eng.getCellValue(1, 1)).toBeNull();
    expect(eng.getCellValue(2, 0)).toBe("keep");
    expect(eng.selection[0]).toMatchObject({ row: [0, 1], column: [0, 1] });
  });

  it("clears every range when more than one is selected", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "a" });
    eng.execute({ type: "setCellValue", row: 0, col: 1, value: "keep" });
    eng.execute({ type: "setCellValue", row: 1, col: 1, value: "b" });
    eng.execute({
      type: "setSelection",
      selection: [
        { row: [0, 0], column: [0, 0] },
        { row: [1, 1], column: [1, 1] },
      ],
    });

    eng.clearSelectionContent();

    expect(eng.getCellValue(0, 0)).toBeNull();
    expect(eng.getCellValue(1, 1)).toBeNull();
    expect(eng.getCellValue(0, 1)).toBe("keep");
  });

  it("removes values and formulas but keeps style and number format", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: 12 });
    eng.execute({ type: "setStyle", row: 0, col: 0, style: { bl: 1, fc: "#ff0000" } });
    eng.execute({ type: "setFormat", row: 0, col: 0, preset: "number" });
    eng.execute({ type: "setCellValue", row: 0, col: 1, value: null, formula: "=A1+1" });
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 1] }],
    });

    eng.clearSelectionContent();

    const styled = eng.workbook.getCell(0, 0);
    expect(eng.getCellValue(0, 0)).toBeNull();
    expect(eng.getCellValue(0, 0, "f")).toBeNull();
    expect(styled?.bl).toBe(1);
    expect(styled?.fc).toBe("#ff0000");
    expect(styled?.ct?.fa).not.toBe("General");
    expect(eng.getCellValue(0, 1)).toBeNull();
    expect(eng.getCellValue(0, 1, "f")).toBeNull();
  });

  it("restores the whole selection with one undo", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "a" });
    eng.execute({ type: "setCellValue", row: 0, col: 1, value: "b" });
    eng.execute({ type: "setCellValue", row: 1, col: 0, value: "c" });
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1] }],
    });

    eng.clearSelectionContent();
    eng.undo();

    expect(eng.getCellValue(0, 0)).toBe("a");
    expect(eng.getCellValue(0, 1)).toBe("b");
    expect(eng.getCellValue(1, 0)).toBe("c");
  });

  it("keeps row height and column width when content is cleared", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "wrapped text" });
    eng.execute({ type: "setStyle", row: 0, col: 0, style: { tb: 2 } });
    eng.execute({ type: "setRowHeight", row: 0, height: 80 });
    eng.execute({ type: "setColWidth", col: 0, width: 120 });
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 0] }],
    });
    const sheet = eng.workbook.getActiveSheet();

    eng.clearSelectionContent();

    expect(eng.getCellValue(0, 0)).toBeNull();
    expect(sheet.getRowHeight(0)).toBe(80);
    expect(sheet.getColWidth(0)).toBe(120);
  });

  it("updates formulas outside the selection that depend on cleared cells", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: 2 });
    eng.execute({ type: "setCellValue", row: 0, col: 1, value: null, formula: "=A1+1" });
    expect(eng.getCellValue(0, 1)).toBe(3);
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 0] }],
    });

    eng.clearSelectionContent();

    expect(eng.getCellValue(0, 0)).toBeNull();
    expect(eng.getCellValue(0, 1, "f")).toBe("=A1+1");
    expect(eng.getCellValue(0, 1)).toBe(1);
  });
});
