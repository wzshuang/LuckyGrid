import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fromLuckyFile, toLuckyFile, frozenToFreeze } from "../src/io/lucky-json.js";
import { Workbook } from "../src/model/workbook.js";
import { WorkbookEngine } from "../src/engine.js";

const fixturePath = resolve(__dirname, "../../../fixtures/lucky/sheet-mini.json");
const formulaFixturePath = resolve(
  __dirname,
  "../../../fixtures/lucky/sheet-formula.json",
);

describe("Lucky JSON IO", () => {
  it("loads fixture and preserves merge + cells", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf-8"));
    const snaps = fromLuckyFile([raw]);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].config.merge?.["2_1"]).toEqual({ r: 2, c: 1, rs: 2, cs: 2 });
    expect(snaps[0].extras?.color).toBe("");
    expect(snaps[0].extras?.zoomRatio).toBe(1);

    const wb = new Workbook(snaps);
    expect(wb.getCell(0, 0)?.v).toBe(1);
    expect(wb.getCell(0, 1)?.m).toBe("Hello");
    expect(wb.getActiveSheet().getMergeAt(3, 2)?.r).toBe(2);
  });

  it("roundtrips unknown fields via extras", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf-8"));
    const snaps = fromLuckyFile([raw]);
    const out = toLuckyFile(snaps);
    expect(out[0].zoomRatio).toBe(1);
    expect(out[0].celldata?.length).toBe(snaps[0].celldata.length);
    expect(out[0].config?.merge).toEqual(snaps[0].config.merge);
  });

  it("maps Luckysheet frozen types to config.freeze", () => {
    expect(frozenToFreeze({ type: "row" })).toEqual({ row: 1, col: 0 });
    expect(frozenToFreeze({ type: "column" })).toEqual({ row: 0, col: 1 });
    expect(frozenToFreeze({ type: "both" })).toEqual({ row: 1, col: 1 });
    expect(
      frozenToFreeze({ type: "rangeRow", range: { row_focus: 2 } }),
    ).toEqual({ row: 3, col: 0 });
    expect(
      frozenToFreeze({ type: "rangeColumn", range: { column_focus: 1 } }),
    ).toEqual({ row: 0, col: 2 });
    expect(
      frozenToFreeze({
        type: "rangeBoth",
        range: { row_focus: 1, column_focus: 2 },
      }),
    ).toEqual({ row: 2, col: 3 });
    expect(frozenToFreeze({ type: "cancel" })).toBeNull();
    expect(frozenToFreeze(undefined)).toBeNull();
  });

  it("loads Formula demo frozen:{type:row} as freeze first row", () => {
    const raw = JSON.parse(readFileSync(formulaFixturePath, "utf-8"));
    expect(raw.frozen).toEqual({ type: "row" });
    const snaps = fromLuckyFile([raw]);
    expect(snaps[0].config.freeze).toEqual({ row: 1, col: 0 });
    expect(snaps[0].extras?.frozen).toEqual({ type: "row" });

    const eng = new WorkbookEngine(snaps);
    expect(eng.workbook.getActiveSheet().config.freeze).toEqual({
      row: 1,
      col: 0,
    });
  });

  it("WorkbookEngine.load maps Luckysheet celldata+frozen (not treated as snapshot)", () => {
    const raw = JSON.parse(readFileSync(formulaFixturePath, "utf-8"));
    // Must go through fromLuckyFile — raw has celldata but no extras key.
    const eng = new WorkbookEngine([raw]);
    expect(eng.workbook.getActiveSheet().config.freeze).toEqual({
      row: 1,
      col: 0,
    });
    expect(eng.workbook.getActiveSheet().extras.frozen).toEqual({ type: "row" });
  });

  it("does not override explicit config.freeze", () => {
    const snaps = fromLuckyFile([
      {
        name: "S",
        frozen: { type: "row" },
        config: { freeze: { row: 3, col: 2 } },
        celldata: [],
      },
    ]);
    expect(snaps[0].config.freeze).toEqual({ row: 3, col: 2 });
  });
});
