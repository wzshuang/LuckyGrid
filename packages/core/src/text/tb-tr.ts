import type { TextRotateMode, TextWrapMode } from "./types.js";

function parseNumeric(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number.parseInt(v.trim(), 10);
  return null;
}

export function normalizeTb(v: unknown): TextWrapMode {
  const n = parseNumeric(v);
  if (n === 0 || n === 1 || n === 2) return n;
  return 0;
}

export function normalizeTr(v: unknown): TextRotateMode {
  const n = parseNumeric(v);
  if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 0;
}

export function tbFromMenu(id: "overflow" | "wrap" | "clip"): TextWrapMode {
  switch (id) {
    case "clip":
      return 0;
    case "overflow":
      return 1;
    case "wrap":
      return 2;
  }
}

export function trFromMenu(
  id: "none" | "angleup" | "angledown" | "vertical" | "rotation-up" | "rotation-down",
): TextRotateMode {
  switch (id) {
    case "none":
      return 0;
    case "angleup":
      return 1;
    case "angledown":
      return 2;
    case "vertical":
      return 3;
    case "rotation-up":
      return 4;
    case "rotation-down":
      return 5;
  }
}

export function rotationAngleDeg(tr: number): number {
  switch (normalizeTr(tr)) {
    case 1:
      return 45;
    case 2:
      return -45;
    case 3:
      return 0;
    case 4:
      return 90;
    case 5:
      return -90;
    default:
      return 0;
  }
}

export function isVerticalText(tr: number): boolean {
  return normalizeTr(tr) === 3;
}
