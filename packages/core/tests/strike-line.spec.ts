import { describe, expect, it } from "vitest";
import { strikeLineY } from "../src/render/canvas-renderer.js";

describe("strikeLineY", () => {
  it("sits one pixel below the middle of the ascent, like Luckysheet", () => {
    // A6 "Style": alphabetic baseline, actualBoundingBoxAscent 15
    expect(strikeLineY(17, 15)).toBe(17 - 15 / 2 + 1);
  });
});
