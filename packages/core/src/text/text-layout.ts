import { isVerticalText, normalizeTb, normalizeTr, rotationAngleDeg } from "./tb-tr.js";
import type { CellTextLayout, MeasureTextFn, TextGlyph } from "./types.js";

export type LayoutCellTextInput = {
  text: string;
  cellWidth: number;
  cellHeight: number;
  tb?: number;
  tr?: number;
  ht?: number; // 0 center, 1 left, 2 right — default 1
  vt?: number; // 0 middle, 1 top, 2 bottom — default 0
  font: string;
  paddingX?: number; // default 2
  paddingY?: number; // default 2
  measureText: MeasureTextFn;
};

function alignOffset(
  contentSize: number,
  innerSize: number,
  mode: number,
  defaultMode: number,
): number {
  const m = mode === 0 || mode === 1 || mode === 2 ? mode : defaultMode;
  if (m === 0) return Math.max(0, (innerSize - contentSize) / 2);
  if (m === 2) return Math.max(0, innerSize - contentSize);
  return 0;
}

function breakLinesByWidth(
  text: string,
  maxWidth: number,
  font: string,
  measureText: MeasureTextFn,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const ch of para) {
      const trial = current + ch;
      const w = measureText(trial, font).width;
      if (current.length > 0 && w > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current = trial;
      }
    }
    lines.push(current);
  }

  return lines;
}

function layoutHorizontalLines(
  lines: string[],
  font: string,
  measureText: MeasureTextFn,
): { glyphs: TextGlyph[]; contentWidth: number; contentHeight: number } {
  const lineHeight = measureText("M", font).height;
  let contentWidth = 0;
  const glyphs: TextGlyph[] = [];
  let y = 0;

  for (const line of lines) {
    const { width, height } = measureText(line, font);
    const h = height > 0 ? height : lineHeight;
    glyphs.push({ text: line, x: 0, y, width, height: h });
    contentWidth = Math.max(contentWidth, width);
    y += h;
  }

  const contentHeight = lines.length === 0 ? 0 : y;
  return { glyphs, contentWidth, contentHeight };
}

function layoutVerticalGlyphs(
  text: string,
  font: string,
  measureText: MeasureTextFn,
): { glyphs: TextGlyph[]; contentWidth: number; contentHeight: number } {
  const chars = [...text.replace(/\n/g, "")];
  const lineHeight = measureText("M", font).height;
  let contentWidth = 0;
  const glyphs: TextGlyph[] = [];
  let y = 0;

  for (const ch of chars) {
    const { width, height } = measureText(ch, font);
    const h = height > 0 ? height : lineHeight;
    glyphs.push({ text: ch, x: 0, y, width, height: h });
    contentWidth = Math.max(contentWidth, width);
    y += h;
  }

  return { glyphs, contentWidth, contentHeight: y };
}

function applyCellAlignment(
  glyphs: TextGlyph[],
  contentWidth: number,
  contentHeight: number,
  cellWidth: number,
  cellHeight: number,
  paddingX: number,
  paddingY: number,
  ht: number,
  vt: number,
): void {
  const innerW = Math.max(0, cellWidth - 2 * paddingX);
  const innerH = Math.max(0, cellHeight - 2 * paddingY);
  const dx = paddingX + alignOffset(contentWidth, innerW, ht, 1);
  const dy = paddingY + alignOffset(contentHeight, innerH, vt, 0);

  for (const g of glyphs) {
    g.x += dx;
    g.y += dy;
  }
}

export function layoutCellText(input: LayoutCellTextInput): CellTextLayout {
  const {
    text,
    cellWidth,
    cellHeight,
    font,
    measureText,
    tb: rawTb,
    tr: rawTr,
    ht = 1,
    vt = 0,
    paddingX = 2,
    paddingY = 2,
  } = input;

  const tb = normalizeTb(rawTb);
  const tr = normalizeTr(rawTr);
  const overflow = tb === 1 && tr === 0;
  const angleDeg = rotationAngleDeg(tr);

  let glyphs: TextGlyph[];
  let contentWidth: number;
  let contentHeight: number;

  if (isVerticalText(tr)) {
    ({ glyphs, contentWidth, contentHeight } = layoutVerticalGlyphs(text, font, measureText));
  } else {
    const maxWidth = Math.max(0, cellWidth - 2 * paddingX);
    const lines =
      tb === 2 ? breakLinesByWidth(text, maxWidth, font, measureText) : text.split("\n");
    ({ glyphs, contentWidth, contentHeight } = layoutHorizontalLines(lines, font, measureText));
  }

  applyCellAlignment(glyphs, contentWidth, contentHeight, cellWidth, cellHeight, paddingX, paddingY, ht, vt);

  return {
    glyphs,
    contentWidth,
    contentHeight,
    angleDeg,
    overflow,
  };
}
