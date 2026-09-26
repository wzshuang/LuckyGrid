import { describe, expect, it } from "vitest";
import { layoutCellText, layoutInlineRuns } from "../src/text/text-layout.js";

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

  it("spaces wrapped lines by 1.5× ascent, like Luckysheet", () => {
    const ascent = 10;
    const descent = 3;
    const layout = layoutCellText({
      text: "abcdefgh",
      cellWidth: 45,
      cellHeight: 80,
      tb: 2,
      vt: 1,
      font: "11pt Times New Roman",
      measureText: (text) => ({
        width: text.length * 10,
        height: ascent + descent,
        ascent,
        descent,
      }),
    });
    expect(layout.glyphs.length).toBeGreaterThan(1);
    const gap = layout.glyphs[1]!.y - layout.glyphs[0]!.y;
    expect(gap).toBe(ascent * 1.5);
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

  it("does not mark overflow when tb=1 but tr is non-zero", () => {
    const layout = layoutCellText({
      text: "abcdefghij",
      cellWidth: 30,
      cellHeight: 19,
      tb: 1,
      tr: 1,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    expect(layout.overflow).toBe(false);
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

  it("honors string ht/vt like Lucky sheet-cell Alignment demos", () => {
    const leftTop = layoutCellText({
      text: "A",
      cellWidth: 100,
      cellHeight: 40,
      ht: "1",
      vt: "1",
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    const centerMiddle = layoutCellText({
      text: "A",
      cellWidth: 100,
      cellHeight: 40,
      ht: "0",
      vt: "0",
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    const rightBottom = layoutCellText({
      text: "A",
      cellWidth: 100,
      cellHeight: 40,
      ht: "2",
      vt: "2",
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    expect(leftTop.glyphs[0]!.x).toBe(2);
    expect(leftTop.glyphs[0]!.y).toBe(2);
    expect(centerMiddle.glyphs[0]!.x).toBeGreaterThan(leftTop.glyphs[0]!.x);
    expect(centerMiddle.glyphs[0]!.y).toBeGreaterThan(leftTop.glyphs[0]!.y);
    expect(rightBottom.glyphs[0]!.x).toBeGreaterThan(centerMiddle.glyphs[0]!.x);
    expect(rightBottom.glyphs[0]!.y).toBeGreaterThan(centerMiddle.glyphs[0]!.y);
  });

  it("wraps rotated tb=2 by projected height, not only cell width", () => {
    const byWidth = layoutCellText({
      text: "abcdefghijklmnop",
      cellWidth: 200,
      cellHeight: 36,
      tb: 2,
      tr: 0,
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    const byRotate = layoutCellText({
      text: "abcdefghijklmnop",
      cellWidth: 200,
      cellHeight: 36,
      tb: 2,
      tr: 1,
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    // Without rotation, wide cell → one long line; with 45° wrap limit is tighter
    expect(byWidth.glyphs.length).toBe(1);
    expect(byRotate.glyphs.length).toBeGreaterThan(1);
    expect(byRotate.glyphSpace).toBe("pivot");
    expect(byRotate.pivotY).toBe(18); // left + middle → pivot at cell mid
    expect(byRotate.angleDeg).toBe(45);
    // Left+upward: stack on +Y; parallelogram skew pushes later lines in +X
    expect(byRotate.glyphs[0]!.y).toBeGreaterThanOrEqual(0);
    expect(byRotate.glyphs[0]!.x).toBe(0);
    if (byRotate.glyphs.length > 1) {
      expect(byRotate.glyphs[1]!.x).toBeGreaterThan(0);
    }
  });
});

describe("layoutInlineRuns", () => {
  const measure: typeof import("../src/text/types.js").MeasureTextFn = (text, font) => {
    const fs = Number(font.match(/(\d+)pt/)?.[1] ?? 10);
    return { width: text.length * fs, height: fs };
  };

  it("keeps each run's font, color, and strike on one baseline", () => {
    const layout = layoutInlineRuns({
      runs: [
        { v: "Inline", fs: 12, fc: "rgb(255, 0, 0)", ff: "Arial", bl: 0, it: 0, cl: 0 },
        { v: " ", fs: 12, fc: "#000000", ff: "Arial" },
        { v: "Style", fs: 16, fc: "#000000", ff: "Arial", it: 1, cl: 1 },
        { v: " ", fs: 12, fc: "#000000", ff: "Arial" },
        { v: "Cell", fs: 12, fc: "#000000", ff: "Arial", bl: 1 },
      ],
      cellWidth: 400,
      cellHeight: 40,
      ht: 1,
      vt: 1,
      measureText: measure,
    });

    expect(layout.glyphs.map((g) => g.text)).toEqual(["Inline", " ", "Style", " ", "Cell"]);
    const inline = layout.glyphs[0]!;
    const style = layout.glyphs[2]!;
    const cell = layout.glyphs[4]!;
    expect(inline.color).toBe("rgb(255, 0, 0)");
    expect(inline.font).toContain("12pt");
    expect(inline.font).not.toContain("italic");
    expect(inline.font).not.toContain("bold");
    expect(style.font).toContain("italic");
    expect(style.font).toContain("16pt");
    expect(style.cl).toBe(1);
    expect(cell.font).toContain("bold");
    expect(style.textBaseline).toBe("alphabetic");
    expect(style.y).toBe(inline.y);
    expect(style.y).toBe(2 + 16);
    expect(style.x).toBeGreaterThan(inline.x + inline.width - 1);
    expect(cell.x).toBeGreaterThan(style.x + style.width - 1);
  });

  it("reads a string font size the way Luckysheet does", () => {
    const layout = layoutInlineRuns({
      runs: [
        {
          v: "TextRotate",
          ff: '"times new roman"',
          fc: "rgb(51, 51, 51)",
          fs: "12",
          bl: 1,
          it: 0,
        },
      ],
      cellWidth: 120,
      cellHeight: 36,
      ht: 1,
      vt: 0,
      measureText: measure,
    });
    const glyph = layout.glyphs[0]!;
    expect(glyph.font).toContain("bold 12pt");
    expect(glyph.font).not.toContain("10pt");
    expect(glyph.fs).toBe(12);
  });

  it("keeps Luckysheet's top inset instead of pinning text to the cell top", () => {
    const measure: typeof import("../src/text/types.js").MeasureTextFn = (_text, font) => {
      const fs = Number(font.match(/(\d+)pt/)?.[1] ?? 10);
      const ascent = fs === 16 ? 15 : 12;
      const descent = fs === 16 ? 4 : 0;
      return { width: 40, height: ascent + descent, ascent, descent };
    };
    const layout = layoutInlineRuns({
      runs: [{ v: "Style", fs: 16, it: 1, ff: "Arial" }],
      cellWidth: 131,
      cellHeight: 20,
      ht: 1,
      vt: 1,
      measureText: measure,
    });
    const glyph = layout.glyphs[0]!;
    expect(glyph.textBaseline).toBe("alphabetic");
    expect(glyph.y).toBe(2 + 15);
  });
});
