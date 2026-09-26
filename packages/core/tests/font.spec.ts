import { describe, expect, it } from "vitest";
import { cellCanvasFont, luckyFontFamilyStack } from "../src/text/font.js";

const FALLBACK =
  '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';

describe("lucky font", () => {
  it("defaults to Times New Roman at 10pt", () => {
    expect(cellCanvasFont(null)).toBe(`10pt "Times New Roman", ${FALLBACK}`);
    expect(cellCanvasFont({})).toBe(`10pt "Times New Roman", ${FALLBACK}`);
    expect(luckyFontFamilyStack(0)).toContain('"Times New Roman"');
  });

  it("maps ff index and keeps weight and style", () => {
    expect(cellCanvasFont({ ff: 1, fs: 12, bl: 1, it: 1 })).toBe(
      `italic bold 12pt Arial, ${FALLBACK}`,
    );
    expect(cellCanvasFont({ ff: "4" })).toContain("微软雅黑");
    expect(cellCanvasFont({ ff: "Courier New" })).toContain('"Courier New"');
  });
});
