import { describe, expect, it } from "vitest";
import { borderLineStroke } from "../src/border/border-line-stroke.js";
import { BORDER_LINE_STYLES } from "../src/border/types.js";

describe("borderLineStroke", () => {
  it("exposes 13 line styles like Lucky", () => {
    expect(BORDER_LINE_STYLES).toHaveLength(13);
    expect(BORDER_LINE_STYLES[0]?.value).toBe(1);
    expect(BORDER_LINE_STYLES[12]?.value).toBe(13);
  });

  it("style 1 is thin solid", () => {
    const s = borderLineStroke(1);
    expect(s.lineWidth).toBe(1);
    expect(s.dash).toEqual([]);
  });

  it("style 2 Hair matches Lucky setLineDash([1,2])", () => {
    const s = borderLineStroke(2);
    expect(s.lineWidth).toBe(1);
    expect(s.dash).toEqual([1, 2]);
  });

  it("style 3 is dotted", () => {
    const s = borderLineStroke(3);
    expect(s.dash).toEqual([2]);
  });

  it("style 9 MediumDashed is width 2 dashed", () => {
    const s = borderLineStroke(9);
    expect(s.lineWidth).toBe(2);
    expect(s.dash).toEqual([3]);
  });

  it("style 7 Double reports dual stroke flag", () => {
    const s = borderLineStroke(7);
    expect(s.lineWidth).toBe(1);
    expect(s.dual).toBe(true);
  });

  it("style 8 Medium reports mediumAlign", () => {
    expect(borderLineStroke(8).mediumAlign).toBe(true);
    expect(borderLineStroke(9).mediumAlign).toBe(true);
  });
});
