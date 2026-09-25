import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";

describe("borders", () => {
  it("materializes config.borderInfo cell entries onto cell.bd on load", () => {
    const eng = new WorkbookEngine([
      {
        name: "S",
        index: 0,
        order: 0,
        status: 1,
        celldata: [{ r: 3, c: 3, v: { v: "x", m: "x" } }],
        config: {
          borderInfo: [
            {
              rangeType: "cell",
              value: {
                row_index: 3,
                col_index: 3,
                l: { style: 10, color: "rgb(255, 0, 0)" },
                r: { style: 10, color: "rgb(255, 0, 0)" },
                t: { style: 10, color: "rgb(255, 0, 0)" },
                b: { style: 10, color: "rgb(255, 0, 0)" },
              },
            },
          ],
        },
      },
    ]);
    const bd = eng.workbook.getCell(3, 3)?.bd;
    expect(bd?.t?.color).toBe("rgb(255, 0, 0)");
    expect(bd?.t?.style).toBe(10);
    expect(bd?.l?.style).toBe(10);
    expect(bd?.r?.style).toBe(10);
    expect(bd?.b?.style).toBe(10);
  });

  it("materializes config.borderInfo range border-all on load", () => {
    const eng = new WorkbookEngine([
      {
        name: "S",
        index: 0,
        order: 0,
        status: 1,
        celldata: [],
        config: {
          borderInfo: [
            {
              rangeType: "range",
              borderType: "border-all",
              style: "2",
              color: "#ff0000",
              range: [{ row: [3, 3], column: [3, 4] }],
            },
          ],
        },
      },
    ]);
    expect(eng.workbook.getCell(3, 3)?.bd?.t?.color).toBe("#ff0000");
    expect(eng.workbook.getCell(3, 3)?.bd?.t?.style).toBe(2);
    expect(eng.workbook.getCell(3, 4)?.bd?.r?.color).toBe("#ff0000");
  });

  it("loads D4 border from sheet-cell fixture borderInfo", () => {
    const raw = JSON.parse(
      readFileSync(resolve(__dirname, "../../../fixtures/lucky/sheet-cell.json"), "utf-8"),
    );
    const eng = new WorkbookEngine([raw]);
    const d4 = eng.workbook.getCell(3, 3)?.bd;
    expect(d4?.t).toBeTruthy();
    expect(d4?.l).toBeTruthy();
    expect(eng.workbook.getCell(3, 8)?.bd?.t).toBeTruthy();
  });

  it("border-none clears neighbor opposite edges", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1] }],
    });
    eng.applyBordersToSelection("border-all", "#000", 1);
    expect(eng.workbook.getCell(0, 1)?.bd?.b).toBeTruthy();
    expect(eng.workbook.getCell(1, 0)?.bd?.r).toBeTruthy();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [1, 1], column: [1, 1] }],
    });
    eng.applyBordersToSelection("border-none");
    expect(eng.workbook.getCell(1, 1)?.bd).toBeUndefined();
    expect(eng.workbook.getCell(0, 1)?.bd?.b).toBeUndefined();
    expect(eng.workbook.getCell(1, 0)?.bd?.r).toBeUndefined();
  });

  it("insertRows shifts borderInfo cell row_index", () => {
    const eng = new WorkbookEngine([
      {
        name: "S",
        index: 0,
        order: 0,
        status: 1,
        celldata: [{ r: 2, c: 1, v: { v: "x", m: "x" } }],
        config: {
          borderInfo: [
            {
              rangeType: "cell",
              value: {
                row_index: 2,
                col_index: 1,
                t: { style: 1, color: "#f00" },
                b: { style: 1, color: "#f00" },
                l: { style: 1, color: "#f00" },
                r: { style: 1, color: "#f00" },
              },
            },
          ],
        },
      },
    ]);
    expect(eng.workbook.getCell(2, 1)?.bd?.t?.color).toBe("#f00");
    eng.execute({ type: "insertRows", index: 1, count: 1 });
    const info = eng.workbook.getActiveSheet().config.borderInfo as Array<{
      rangeType: string;
      value?: { row_index: number };
    }>;
    expect(info.some((e) => e.rangeType === "cell" && e.value?.row_index === 3)).toBe(
      true,
    );
    expect(eng.workbook.getCell(3, 1)?.bd?.t?.color).toBe("#f00");
    expect(eng.workbook.getCell(2, 1)?.bd?.t).toBeUndefined();
  });

  it("applies all borders to selection and undoes", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1] }],
    });
    eng.applyBordersToSelection("border-all", "#ff0000", 1);
    const cell = eng.workbook.getCell(0, 0);
    expect(cell?.bd?.t?.color).toBe("#ff0000");
    expect(cell?.bd?.l?.color).toBe("#ff0000");
    expect(eng.workbook.getActiveSheet().config.borderInfo).toHaveLength(1);
    eng.undo();
    expect(eng.workbook.getCell(0, 0)?.bd).toBeUndefined();
  });

  it("outside only paints perimeter", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 2], column: [0, 2] }],
    });
    eng.applyBordersToSelection("border-outside");
    expect(eng.workbook.getCell(1, 1)?.bd?.t).toBeUndefined();
    expect(eng.workbook.getCell(0, 1)?.bd?.t).toBeTruthy();
    expect(eng.workbook.getCell(1, 0)?.bd?.l).toBeTruthy();
  });

  it("border-top paints top row only in 2x2", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1] }],
    });
    eng.applyBordersToSelection("border-top", "#00ff00", 2);
    expect(eng.workbook.getCell(0, 0)?.bd?.t?.color).toBe("#00ff00");
    expect(eng.workbook.getCell(0, 0)?.bd?.t?.style).toBe(2);
    expect(eng.workbook.getCell(1, 0)?.bd?.t).toBeUndefined();
  });

  it("border-inside adds internal edges in 2x2", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1] }],
    });
    eng.applyBordersToSelection("border-inside");
    expect(eng.workbook.getCell(0, 0)?.bd?.r).toBeTruthy();
    expect(eng.workbook.getCell(0, 1)?.bd?.l).toBeTruthy();
  });

  it("border-all on merged block outlines cells on perimeter", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 1], column: [0, 1] }],
    });
    eng.mergeSelection();
    eng.applyBordersToSelection("border-all");
    expect(eng.workbook.getCell(0, 0)?.bd?.t).toBeTruthy();
    expect(eng.workbook.getCell(0, 0)?.bd?.l).toBeTruthy();
    expect(eng.workbook.getCell(1, 1)?.bd?.b).toBeTruthy();
    expect(eng.workbook.getCell(1, 1)?.bd?.r).toBeTruthy();
  });
});
