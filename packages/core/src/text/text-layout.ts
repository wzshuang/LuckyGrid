import { cellCanvasFont, luckyFontSize } from "./font.js";
import { isVerticalText, normalizeHt, normalizeTb, normalizeTr, normalizeVt, rotationAngleDeg } from "./tb-tr.js";
import type { CellTextLayout, MeasureTextFn, TextGlyph } from "./types.js";

export type LayoutCellTextInput = {
  text: string;
  cellWidth: number;
  cellHeight: number;
  tb?: number | string;
  tr?: number | string;
  /** horizontal align: 0 center, 1 left, 2 right — may be Lucky string */
  ht?: number | string;
  /** vertical align: 0 middle, 1 top, 2 bottom — may be Lucky string */
  vt?: number | string;
  font: string;
  paddingX?: number; // default 2
  paddingY?: number; // default 2
  measureText: MeasureTextFn;
};

function alignOffset(
  contentSize: number,
  innerSize: number,
  mode: 0 | 1 | 2,
): number {
  if (mode === 0) return Math.max(0, (innerSize - contentSize) / 2);
  if (mode === 2) return Math.max(0, innerSize - contentSize);
  return 0;
}

/**
 * Max run length along the text axis when rotated.
 * Lucky: break when textWidth·sin + textHeight·cos exceeds cellHeight.
 * Use a tight line box (prefer ascent-like height) so wraps aren't overly narrow —
 * too-small maxWidth creates a band wider than the cell and clips most of the text.
 */
function wrapMaxWidthForRotation(
  cellHeight: number,
  lineHeight: number,
  angleDeg: number,
  paddingY: number,
): number {
  const abs = Math.abs(angleDeg);
  if (abs < 1e-6) return Number.POSITIVE_INFINITY;

  const rad = (abs * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  // Lucky getMeasureText uses ascent+descent (~0.7–0.85 of em box), not full line box
  const textH = Math.max(8, lineHeight * 0.75);
  const usable = Math.max(0, cellHeight - 2 * paddingY - textH * cos);
  const byHeight = sin > 1e-6 ? usable / sin : Number.POSITIVE_INFINITY;
  return Math.max(textH, byHeight);
}

/** Lucky textLeftAll / textTopAll for rotated plainWrap. */
function rotationPivot(
  ht: 0 | 1 | 2,
  vt: 0 | 1 | 2,
  cellWidth: number,
  cellHeight: number,
  projectedW: number,
  projectedH: number,
): { pivotX: number; pivotY: number } {
  if (ht === 0) {
    if (vt === 0) return { pivotX: cellWidth / 2, pivotY: cellHeight / 2 };
    if (vt === 1) return { pivotX: cellWidth / 2, pivotY: projectedH / 2 };
    return { pivotX: cellWidth / 2, pivotY: cellHeight - projectedH / 2 };
  }
  if (ht === 1) {
    if (vt === 0) return { pivotX: 0, pivotY: cellHeight / 2 };
    if (vt === 1) return { pivotX: 0, pivotY: 0 };
    return { pivotX: 0, pivotY: cellHeight };
  }
  if (vt === 0) return { pivotX: cellWidth - projectedW / 2, pivotY: cellHeight / 2 };
  if (vt === 1) return { pivotX: cellWidth, pivotY: 0 };
  return { pivotX: cellWidth, pivotY: cellHeight };
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
  /** optional override for inter-line step (rotated wrap uses a tighter box) */
  stackStep?: number,
): { glyphs: TextGlyph[]; contentWidth: number; contentHeight: number } {
  const lineHeight = measureText("M", font).height;
  const step = stackStep ?? lineHeight;
  let contentWidth = 0;
  const glyphs: TextGlyph[] = [];
  let y = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const measured = measureText(line, font);
    const h = measured.height > 0 ? measured.height : lineHeight;
    glyphs.push({ text: line, x: 0, y, width: measured.width, height: h });
    contentWidth = Math.max(contentWidth, measured.width);
    if (i < lines.length - 1) {
      // Luckysheet wrap: line box is ascent + ascent/2 (`sHeight += sHeight/2`).
      const ascent = measured.ascent && measured.ascent > 0 ? measured.ascent : h;
      y += stackStep ?? ascent * 1.5;
    }
  }

  const contentHeight =
    lines.length === 0 ? 0 : lines.length === 1 ? step : y + (glyphs[glyphs.length - 1]?.height ?? 0);
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
  ht: 0 | 1 | 2,
  vt: 0 | 1 | 2,
): void {
  const innerW = Math.max(0, cellWidth - 2 * paddingX);
  const innerH = Math.max(0, cellHeight - 2 * paddingY);
  const dx = paddingX + alignOffset(contentWidth, innerW, ht);
  const dy = paddingY + alignOffset(contentHeight, innerH, vt);

  for (const g of glyphs) {
    const lineDx = alignOffset(g.width, contentWidth, ht);
    g.x += dx + lineDx;
    g.y += dy;
  }
}

/**
 * Lucky rotate-wrap parallelogram: offset each line so that after rotate(-angle)
 * the wrap stack becomes horizontal (fills cell width, stays within band height).
 */
function applyRotateWrapSkew(glyphs: TextGlyph[], angleDeg: number): void {
  const abs = Math.abs(angleDeg);
  if (abs < 1e-6 || Math.abs(abs - 90) < 0.5) return;
  const tan = Math.tan((angleDeg * Math.PI) / 180);
  if (!Number.isFinite(tan) || Math.abs(tan) < 1e-6) return;
  for (const g of glyphs) {
    g.x += g.y / tan;
  }
}

/**
 * Pivot-local frame for rotated wrap.
 * - Flip stack to the inward side for left/right edge pivots.
 * - Skew so wrap stack maps to horizontal after rotate(-angle).
 */
function anchorRotatedGlyphs(
  glyphs: TextGlyph[],
  contentWidth: number,
  contentHeight: number,
  ht: 0 | 1 | 2,
  angleDeg: number,
): void {
  const inwardY = angleDeg >= 0 ? 1 : -1;
  if (inwardY < 0) {
    for (const g of glyphs) {
      g.y = -(g.y + g.height);
    }
  }

  applyRotateWrapSkew(glyphs, angleDeg);

  const ax = ht === 0 ? contentWidth / 2 : ht === 2 ? contentWidth : 0;
  let ay = 0;
  if (ht === 0) {
    ay = inwardY > 0 ? contentHeight / 2 : -contentHeight / 2;
  }

  for (const g of glyphs) {
    const lineDx = alignOffset(g.width, contentWidth, ht);
    g.x += -ax + lineDx;
    g.y += -ay;
  }
}

/** Screen-space band size after rotate (Lucky textWidthAll / textHeightAll for wrap+rotate). */
function rotatedWrapBandSize(
  lineWidth: number,
  stackHeight: number,
  angleDeg: number,
): { width: number; height: number } {
  const abs = Math.abs(angleDeg);
  const rad = (abs * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  if (sin < 1e-6) {
    return { width: lineWidth, height: stackHeight };
  }
  return {
    width: stackHeight / sin + lineWidth * cos,
    height: lineWidth * sin,
  };
}

function projectedSize(
  width: number,
  height: number,
  angleDeg: number,
): { width: number; height: number } {
  const abs = Math.abs(angleDeg);
  if (abs < 1e-6) return { width, height };
  const rad = (abs * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

/** Single-line (no wrap) rotate: keep content relative to pivot with edge-safe anchor. */
function anchorRotatedGlyphsSimple(
  glyphs: TextGlyph[],
  contentWidth: number,
  contentHeight: number,
  ht: 0 | 1 | 2,
  vt: 0 | 1 | 2,
): void {
  const ax = ht === 0 ? contentWidth / 2 : ht === 2 ? contentWidth : 0;
  const ay = vt === 0 ? contentHeight / 2 : vt === 2 ? contentHeight : 0;
  for (const g of glyphs) {
    const lineDx = alignOffset(g.width, contentWidth, ht);
    g.x += -ax + lineDx;
    g.y += -ay;
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
    ht: rawHt,
    vt: rawVt,
    paddingX = 2,
    paddingY = 2,
  } = input;

  const tb = normalizeTb(rawTb);
  const tr = normalizeTr(rawTr);
  const ht = normalizeHt(rawHt, 1);
  const vt = normalizeVt(rawVt, 0);
  const overflow = tb === 1 && tr === 0;
  const angleDeg = rotationAngleDeg(tr);

  let glyphs: TextGlyph[];
  let contentWidth: number;
  let contentHeight: number;

  if (isVerticalText(tr)) {
    ({ glyphs, contentWidth, contentHeight } = layoutVerticalGlyphs(text, font, measureText));
    applyCellAlignment(glyphs, contentWidth, contentHeight, cellWidth, cellHeight, paddingX, paddingY, ht, vt);
    return {
      glyphs,
      contentWidth,
      contentHeight,
      angleDeg: 0,
      overflow: false,
      pivotX: 0,
      pivotY: 0,
      glyphSpace: "cell",
    };
  }

  const lineHeight = measureText("M", font).height;

  // Rotated + wrap: text-axis frame + parallelogram skew + canvas rotate(-rt)
  if (angleDeg !== 0 && tb === 2) {
    const maxWidth = wrapMaxWidthForRotation(cellHeight, lineHeight, angleDeg, paddingY);
    const lines = breakLinesByWidth(text, maxWidth, font, measureText);
    // Stack step must be ≥ glyph box or lines overlap after rotate into the band
    ({ glyphs, contentWidth, contentHeight } = layoutHorizontalLines(lines, font, measureText));
    const band = rotatedWrapBandSize(contentWidth, contentHeight, angleDeg);
    const { pivotX, pivotY } = rotationPivot(ht, vt, cellWidth, cellHeight, band.width, band.height);
    anchorRotatedGlyphs(glyphs, contentWidth, contentHeight, ht, angleDeg);
    return {
      glyphs,
      contentWidth: band.width,
      contentHeight: band.height,
      angleDeg,
      overflow,
      pivotX,
      pivotY,
      glyphSpace: "pivot",
    };
  }

  // Rotated, no wrap: single (or explicit \n) run in text-axis frame
  if (angleDeg !== 0) {
    const lines = text.split("\n");
    ({ glyphs, contentWidth, contentHeight } = layoutHorizontalLines(lines, font, measureText));
    const projected = projectedSize(contentWidth, contentHeight, angleDeg);
    const { pivotX, pivotY } = rotationPivot(
      ht,
      vt,
      cellWidth,
      cellHeight,
      projected.width,
      projected.height,
    );
    anchorRotatedGlyphsSimple(glyphs, contentWidth, contentHeight, ht, vt);
    return {
      glyphs,
      contentWidth: projected.width,
      contentHeight: projected.height,
      angleDeg,
      overflow,
      pivotX,
      pivotY,
      glyphSpace: "pivot",
    };
  }

  const maxWidth = Math.max(0, cellWidth - 2 * paddingX);
  const lines =
    tb === 2 ? breakLinesByWidth(text, maxWidth, font, measureText) : text.split("\n");
  ({ glyphs, contentWidth, contentHeight } = layoutHorizontalLines(lines, font, measureText));
  applyCellAlignment(glyphs, contentWidth, contentHeight, cellWidth, cellHeight, paddingX, paddingY, ht, vt);

  return {
    glyphs,
    contentWidth,
    contentHeight,
    angleDeg: 0,
    overflow,
    pivotX: 0,
    pivotY: 0,
    glyphSpace: "cell",
  };
}

/** One Lucky `ct.s` run. Font fields live on the run, not the cell. */
export type InlineTextRun = {
  v?: unknown;
  bl?: unknown;
  it?: unknown;
  ff?: unknown;
  fs?: unknown;
  fc?: unknown;
  cl?: unknown;
  un?: unknown;
};

export type LayoutInlineRunsInput = {
  runs: InlineTextRun[];
  cellWidth: number;
  cellHeight: number;
  tb?: number | string;
  ht?: number | string;
  vt?: number | string;
  paddingX?: number;
  paddingY?: number;
  measureText: MeasureTextFn;
};

type InlinePiece = {
  text: string;
  font: string;
  color: string;
  fs: number;
  cl: number;
  un: number;
  width: number;
  ascent: number;
  descent: number;
};

/**
 * Horizontal inlineStr layout.
 * Original `getCellTextInfo` draws each run with its own font, color, strike, and underline,
 * sharing one baseline per line. Wrap only when tb is 2.
 */
export function layoutInlineRuns(input: LayoutInlineRunsInput): CellTextLayout {
  const {
    runs,
    cellWidth,
    cellHeight,
    measureText,
    paddingX = 2,
    paddingY = 2,
  } = input;
  const tb = normalizeTb(input.tb);
  const ht = normalizeHt(input.ht);
  const vt = normalizeVt(input.vt);
  const maxWidth = Math.max(0, cellWidth - 2 * paddingX);
  const lines = breakInlineLines(runs, tb, maxWidth, measureText);

  const glyphs: TextGlyph[] = [];
  const lineSpans: Array<{ start: number; width: number }> = [];
  let contentWidth = 0;
  let y = 0;
  for (const line of lines) {
    const maxAscent = line.reduce((max, piece) => Math.max(max, piece.ascent), 0);
    const maxDescent = line.reduce((max, piece) => Math.max(max, piece.descent), 0);
    const lineWidth = line.reduce((sum, piece) => sum + piece.width, 0);
    contentWidth = Math.max(contentWidth, lineWidth);
    lineSpans.push({ start: glyphs.length, width: lineWidth });
    const baseline = y + maxAscent;
    let x = 0;
    for (const piece of line) {
      glyphs.push({
        text: piece.text,
        x,
        y: baseline,
        width: piece.width,
        height: piece.ascent + piece.descent,
        textBaseline: "alphabetic",
        font: piece.font,
        color: piece.color,
        fs: piece.fs,
        cl: piece.cl,
        un: piece.un,
      });
      x += piece.width;
    }
    y += maxAscent + maxDescent;
  }

  const contentHeight = y;
  const innerW = Math.max(0, cellWidth - 2 * paddingX);
  const innerH = Math.max(0, cellHeight - 2 * paddingY);
  const dx = paddingX + alignOffset(contentWidth, innerW, ht);
  const dy = paddingY + alignOffset(contentHeight, innerH, vt);
  for (let s = 0; s < lineSpans.length; s++) {
    const span = lineSpans[s]!;
    const end = lineSpans[s + 1]?.start ?? glyphs.length;
    const lineDx = alignOffset(span.width, contentWidth, ht);
    for (let i = span.start; i < end; i++) {
      glyphs[i]!.x += dx + lineDx;
      glyphs[i]!.y += dy;
    }
  }

  return {
    glyphs,
    contentWidth,
    contentHeight,
    angleDeg: 0,
    overflow: tb === 1,
    pivotX: 0,
    pivotY: 0,
    glyphSpace: "cell",
  };
}

function finiteNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function breakInlineLines(
  runs: InlineTextRun[],
  tb: 0 | 1 | 2,
  maxWidth: number,
  measureText: MeasureTextFn,
): InlinePiece[][] {
  const lines: InlinePiece[][] = [[]];
  let lineWidth = 0;

  const pushPiece = (piece: InlinePiece) => {
    const line = lines[lines.length - 1]!;
    if (tb === 2 && line.length > 0 && lineWidth + piece.width > maxWidth) {
      lines.push([piece]);
      lineWidth = piece.width;
      return;
    }
    line.push(piece);
    lineWidth += piece.width;
  };

  for (const run of runs) {
    const parts = String(run.v ?? "").split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push([]);
        lineWidth = 0;
      }
      const text = parts[i] ?? "";
      if (text === "") continue;
      const fs = luckyFontSize(run.fs);
      const bl = finiteNumber(run.bl);
      const it = finiteNumber(run.it);
      const ff = run.ff;
      const font = cellCanvasFont({
        fs,
        bl,
        it,
        ff: typeof ff === "number" || typeof ff === "string" ? ff : undefined,
      });
      const measured = measureText(text, font);
      const ascent = measured.ascent ?? (measured.height > 0 ? measured.height : fs);
      const descent = measured.descent ?? 0;
      const piece: InlinePiece = {
        text,
        font,
        color: typeof run.fc === "string" && run.fc !== "" ? run.fc : "#000000",
        fs,
        cl: finiteNumber(run.cl) ? 1 : 0,
        un: finiteNumber(run.un) ? 1 : 0,
        width: measured.width,
        ascent,
        descent,
      };
      if (tb === 2 && piece.width > maxWidth && [...text].length > 1) {
        for (const ch of [...text]) {
          const chSize = measureText(ch, font);
          pushPiece({
            ...piece,
            text: ch,
            width: chSize.width,
            ascent: chSize.ascent ?? (chSize.height > 0 ? chSize.height : piece.ascent),
            descent: chSize.descent ?? piece.descent,
          });
        }
      } else {
        pushPiece(piece);
      }
    }
  }

  return lines.filter((line) => line.length > 0);
}
