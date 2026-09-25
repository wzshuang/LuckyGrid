import { describe, expect, it } from "vitest";
import {
  normalizeTb,
  normalizeTr,
  tbFromMenu,
  trFromMenu,
  rotationAngleDeg,
  isVerticalText,
} from "../src/text/tb-tr.js";

describe("tb/tr mapping", () => {
  it("maps menu ids to Lucky numbers", () => {
    expect(tbFromMenu("clip")).toBe(0);
    expect(tbFromMenu("overflow")).toBe(1);
    expect(tbFromMenu("wrap")).toBe(2);
    expect(trFromMenu("none")).toBe(0);
    expect(trFromMenu("angleup")).toBe(1);
    expect(trFromMenu("angledown")).toBe(2);
    expect(trFromMenu("vertical")).toBe(3);
    expect(trFromMenu("rotation-up")).toBe(4);
    expect(trFromMenu("rotation-down")).toBe(5);
  });

  it("normalizes string/number and rejects unknown", () => {
    expect(normalizeTb("2")).toBe(2);
    expect(normalizeTb(9)).toBe(0);
    expect(normalizeTr("4")).toBe(4);
    expect(normalizeTr(99)).toBe(0);
  });

  it("maps rotation angles", () => {
    expect(rotationAngleDeg(1)).toBe(45);
    expect(rotationAngleDeg(2)).toBe(-45);
    expect(rotationAngleDeg(4)).toBe(90);
    expect(rotationAngleDeg(5)).toBe(-90);
    expect(isVerticalText(3)).toBe(true);
    expect(isVerticalText(0)).toBe(false);
  });
});
