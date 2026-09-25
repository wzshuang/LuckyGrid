import { describe, expect, it } from "vitest";
import { layoutCellText } from "../src/text/text-layout.js";

const measure =
  (charW = 10, lineH = 12): typeof import("../src/text/types.js").MeasureTextFn =>
  (text) => ({ width: text.length * charW, height: lineH });

describe("layoutCellText", () => {
  it("wraps by width when tb=2", () => {
    const layout = layoutCellText({
      text: "abcdefgh",
      cellWidth: 45,
      cellHeight: 40,
      tb: 2,
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    // usable width ~41 → 4 chars/line → 2 lines
    expect(layout.glyphs.length).toBeGreaterThan(1);
    expect(layout.contentHeight).toBeGreaterThan(12);
    expect(layout.overflow).toBe(false);
  });

  it("honors explicit newlines when wrapping", () => {
    const layout = layoutCellText({
      text: "ab\ncd",
      cellWidth: 200,
      cellHeight: 40,
      tb: 2,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    const ys = new Set(layout.glyphs.map((g) => g.y));
    expect(ys.size).toBe(2);
  });

  it("does not wrap for overflow mode but marks overflow", () => {
    const layout = layoutCellText({
      text: "abcdefghij",
      cellWidth: 30,
      cellHeight: 19,
      tb: 1,
      tr: 0,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    expect(layout.contentWidth).toBe(100);
    expect(layout.overflow).toBe(true);
  });

  it("clip mode does not mark overflow", () => {
    const layout = layoutCellText({
      text: "abcdefghij",
      cellWidth: 30,
      cellHeight: 19,
      tb: 0,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    expect(layout.overflow).toBe(false);
  });

  it("sets angle for tilt and 90deg", () => {
    expect(
      layoutCellText({
        text: "A",
        cellWidth: 40,
        cellHeight: 40,
        tr: 1,
        font: "10pt sans-serif",
        measureText: measure(),
      }).angleDeg,
    ).toBe(45);
    expect(
      layoutCellText({
        text: "A",
        cellWidth: 40,
        cellHeight: 40,
        tr: 5,
        font: "10pt sans-serif",
        measureText: measure(),
      }).angleDeg,
    ).toBe(-90);
  });

  it("stacks glyphs vertically for tr=3", () => {
    const layout = layoutCellText({
      text: "AB",
      cellWidth: 40,
      cellHeight: 80,
      tr: 3,
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    expect(layout.glyphs).toHaveLength(2);
    expect(layout.glyphs[1]!.y).toBeGreaterThan(layout.glyphs[0]!.y);
    expect(layout.angleDeg).toBe(0);
  });
});
