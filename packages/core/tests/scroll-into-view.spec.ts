import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";
import { scrollToRevealCell } from "../src/layout/scroll-into-view.js";

describe("scrollToRevealCell", () => {
  const view = { viewWidth: 200, viewHeight: 150 };

  it("scrolls right when the cell's right edge passes the viewport", () => {
    const next = scrollToRevealCell({
      scrollLeft: 0,
      scrollTop: 0,
      ...view,
      cellLeft: 180,
      cellRight: 260,
      cellTop: 0,
      cellBottom: 19,
    });
    expect(next.scrollLeft).toBe(260 - 200 + 20);
    expect(next.scrollTop).toBe(0);
  });

  it("scrolls left when the cell sits against the left edge", () => {
    const next = scrollToRevealCell({
      scrollLeft: 300,
      scrollTop: 0,
      ...view,
      cellLeft: 40,
      cellRight: 100,
      cellTop: 0,
      cellBottom: 19,
    });
    expect(next.scrollLeft).toBe(40 - 20);
  });

  it("keeps the scroll when the cell is already inside the margin", () => {
    const next = scrollToRevealCell({
      scrollLeft: 100,
      scrollTop: 40,
      ...view,
      cellLeft: 140,
      cellRight: 200,
      cellTop: 70,
      cellBottom: 90,
    });
    expect(next).toEqual({ scrollLeft: 100, scrollTop: 40 });
  });
});

describe("WorkbookEngine.moveFocus", () => {
  it("moves right on tab and scrolls the cell into view", () => {
    const eng = new WorkbookEngine();
    eng.setViewport(200, 200);
    eng.selectAt(0, 0);
    eng.moveFocus(0, 1);
    const focus = eng.getFocusCell();
    expect(focus).toEqual({ row: 0, col: 1 });
    // col width 73, col 1 right edge 146; cell area width 200-46
    expect(eng.workbook.scrollLeft).toBe(146 - (200 - 46) + 20);
  });

  it("scrolls down when arrowing past the viewport", () => {
    const eng = new WorkbookEngine();
    eng.setViewport(400, 80);
    eng.selectAt(0, 0);
    eng.moveFocus(3, 0);
    expect(eng.getFocusCell()).toEqual({ row: 3, col: 0 });
    // row height 19, row 3 bottom 76; cell area height 80-20
    expect(eng.workbook.scrollTop).toBe(76 - (80 - 20) + 20);
  });
});
