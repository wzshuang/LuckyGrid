import { describe, expect, it } from "vitest";
import { displayValue } from "../src/model/cell.js";

describe("displayValue", () => {
  it("prefers m then v", () => {
    expect(displayValue({ m: "shown", v: "raw" })).toBe("shown");
    expect(displayValue({ v: 42 })).toBe("42");
    expect(displayValue({ v: 0 })).toBe("0");
  });

  it("reads inlineStr runs when m/v are empty (sheet-cell A30)", () => {
    expect(
      displayValue({
        ct: {
          fa: "General",
          t: "inlineStr",
          s: [
            {
              v: "TextRotate",
              bl: 1,
            },
          ],
        },
        ht: "1",
        vt: "0",
      }),
    ).toBe("TextRotate");
  });

  it("concatenates multiple inlineStr runs", () => {
    expect(
      displayValue({
        ct: {
          t: "inlineStr",
          s: [{ v: "Hello" }, { v: " " }, { v: "World" }],
        },
      }),
    ).toBe("Hello World");
  });
});
