import type { Workbook } from "../model/workbook.js";
import { displayValue } from "../model/cell.js";
import type { CellBorder } from "../model/cell.js";
import {
  buildColOffsets,
  buildRowOffsets,
  COL_HEADER_HEIGHT,
  colLeft,
  contentSize,
  freezeBandSize,
  FILL_HANDLE_OUTSET,
  FILL_HANDLE_SIZE,
  getCellRect,
  ROW_HEADER_WIDTH,
  rowTop,
  searchOffset,
} from "../hit/location.js";
import { buildHeaderLayout } from "../layout/header-layout.js";
import { visibleCellRange } from "../layout/visible-range.js";
import { GRID_THEME } from "./grid-theme.js";
import { luckyFontFamilyStack } from "../text/font.js";
import { borderLineStroke } from "../border/border-line-stroke.js";
import {
  borderKey,
  computeBorderInfoMap,
} from "../border/materialize-border-info.js";
import { cellCanvasFont } from "../text/font.js";
import { layoutCellText, layoutInlineRuns } from "../text/text-layout.js";
import { scanOverflowSpan } from "../text/overflow.js";
import { normalizeTb, normalizeTr } from "../text/tb-tr.js";
import type { CellTextLayout, MeasureTextFn } from "../text/types.js";
import type { Sheet } from "../model/sheet.js";

/** Temporary row/column resize indicator, in canvas pixels. */
export type HeaderResizeGuide = {
  axis: "row" | "col";
  position: number;
};

/** Luckysheet `drawLineInfo`: strike at `baseline - ascent/2 + 1`. */
export function strikeLineY(baselineY: number, ascent: number): number {
  return baselineY - ascent / 2 + 1;
}

function textDecorationLineYs(
  ty: number,
  baseline: CanvasTextBaseline,
  fsPx: number,
): { underline: number; strike: number } {
  if (baseline === "top") {
    return { underline: ty + fsPx * 0.9, strike: ty + fsPx * 0.45 };
  }
  if (baseline === "bottom") {
    return { underline: ty - fsPx * 0.05, strike: ty - fsPx * 0.45 };
  }
  return { underline: ty + fsPx * 0.3, strike: ty - fsPx * 0.15 };
}

function createCanvasMeasureText(ctx: CanvasRenderingContext2D): MeasureTextFn {
  return (text: string, font: string) => {
    ctx.font = font;
    const m = ctx.measureText(text);
    const ascent = m.actualBoundingBoxAscent || 0;
    const descent = m.actualBoundingBoxDescent || 0;
    const height = ascent + descent || 12;
    return { width: m.width, height, ascent: ascent || height, descent };
  };
}

/** Overflow text is drawn at span.startCol (not endCol); clip spans startCol..endCol. */
function overflowSpanSurfaceRect(
  sheet: Sheet,
  row: number,
  startCol: number,
  endCol: number,
  rowOffsets: number[],
  colOffsets: number[],
  scrollLeft: number,
  scrollTop: number,
): { x: number; y: number; width: number; height: number } {
  const start = getCellRect(
    sheet,
    row,
    startCol,
    rowOffsets,
    colOffsets,
    scrollLeft,
    scrollTop,
  );
  const end = getCellRect(
    sheet,
    row,
    endCol,
    rowOffsets,
    colOffsets,
    scrollLeft,
    scrollTop,
  );
  return {
    x: start.x,
    y: start.y,
    width: end.x + end.width - start.x,
    height: start.height,
  };
}

function isOverflowSpanIntermediateColumn(
  sheet: Sheet,
  row: number,
  col: number,
): boolean {
  for (let c = col - 1; c >= 0; c--) {
    const left = sheet.getCell(row, c);
    const leftText = displayValue(left);
    if (!leftText) continue;
    if (normalizeTb(left?.tb) !== 1 || normalizeTr(left?.tr) !== 0) continue;
    const span = scanOverflowSpan(sheet, row, c);
    if (span.startCol === c && span.endCol >= col) return true;
    break;
  }
  return false;
}

function paintLayoutGlyphs(
  ctx: CanvasRenderingContext2D,
  layout: CellTextLayout,
  originX: number,
  originY: number,
  fs: number,
  cell: { fc?: string | null; un?: number; cl?: number } | null | undefined,
): void {
  const drawAt = (gx: number, gy: number, glyph: CellTextLayout["glyphs"][number]): void => {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = glyph.textBaseline ?? "top";
    if (glyph.font) ctx.font = glyph.font;
    if (glyph.color) ctx.fillStyle = glyph.color;
    ctx.fillText(glyph.text, gx, gy);
    const deco =
      glyph.font != null
        ? { fc: glyph.color ?? cell?.fc, un: glyph.un ?? 0, cl: glyph.cl ?? 0 }
        : cell;
    paintTextDecorations(ctx, glyph.text, gx, gy, glyph.fs ?? fs, deco);
    ctx.restore();
  };

  // Lucky cellTextRender: translate(pivot) → rotate(-rt) → draw words in pre-rotate frame
  if (layout.glyphSpace === "pivot" && layout.angleDeg !== 0) {
    const px = originX + layout.pivotX;
    const py = originY + layout.pivotY;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((-layout.angleDeg * Math.PI) / 180);
    for (const glyph of layout.glyphs) {
      drawAt(glyph.x, glyph.y, glyph);
    }
    ctx.restore();
    return;
  }

  for (const glyph of layout.glyphs) {
    drawAt(originX + glyph.x, originY + glyph.y, glyph);
  }
}

function paintTextDecorations(
  ctx: CanvasRenderingContext2D,
  text: string,
  tx: number,
  ty: number,
  fs: number,
  cell: { fc?: string | null; un?: number; cl?: number } | null | undefined,
): void {
  if (!cell?.un && !cell?.cl) return;
  const fsPx = fs * (96 / 72);
  const metrics = ctx.measureText(text);
  const width = metrics.width;
  let x0 = tx;
  if (ctx.textAlign === "center") x0 = tx - width / 2;
  else if (ctx.textAlign === "right") x0 = tx - width;

  const lines = textDecorationLineYs(ty, ctx.textBaseline, fsPx);
  let { underline, strike } = lines;
  if (ctx.textBaseline === "alphabetic") {
    const ascent =
      metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fsPx * 0.8;
    strike = strikeLineY(ty, ascent);
  }
  ctx.save();
  ctx.strokeStyle = cell.fc ?? "#000000";
  ctx.lineWidth = Math.max(1, Math.floor(fs / 9));
  ctx.beginPath();
  if (cell.un) {
    ctx.moveTo(x0, underline);
    ctx.lineTo(x0 + width, underline);
  }
  if (cell.cl) {
    ctx.moveTo(x0, strike);
    ctx.lineTo(x0 + width, strike);
  }
  ctx.stroke();
  ctx.restore();
}

export type RenderViewport = {
  width: number;
  height: number;
};

export class CanvasRenderer {
  private dpr = 1;
  private rowOffsets: number[] = [];
  private colOffsets: number[] = [];
  private headerResizeGuide: HeaderResizeGuide | null = null;

  setHeaderResizeGuide(guide: HeaderResizeGuide | null): void {
    this.headerResizeGuide = guide;
  }

  constructor(
    private workbook: Workbook,
    private canvas: HTMLCanvasElement,
  ) {
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  }

  getOffsets(): { rowOffsets: number[]; colOffsets: number[] } {
    return { rowOffsets: this.rowOffsets, colOffsets: this.colOffsets };
  }

  resize(cssWidth: number, cssHeight: number): void {
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);
  }

  paint(viewport: RenderViewport): void {
    const sheet = this.workbook.getActiveSheet();
    this.rowOffsets = buildRowOffsets(sheet);
    this.colOffsets = buildColOffsets(sheet);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const w = viewport.width;
    const h = viewport.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = GRID_THEME.canvasBackground;
    ctx.fillRect(0, 0, w, h);

    const scrollLeft = this.workbook.scrollLeft;
    const scrollTop = this.workbook.scrollTop;
    const freeze = sheet.config.freeze ?? { row: 0, col: 0 };
    const band = freezeBandSize(sheet, this.rowOffsets, this.colOffsets);

    const gx = ROW_HEADER_WIDTH;
    const gy = COL_HEADER_HEIGHT;
    const cellW = Math.max(0, w - gx);
    const cellH = Math.max(0, h - gy);
    const cellViewport = { width: cellW, height: cellH };

    this.paintHeaders(ctx, cellViewport, gx, gy);

    let scrollStartCol: number;
    let endCol: number;
    let scrollStartRow: number;
    let endRow: number;
    if (freeze.row === 0 && freeze.col === 0) {
      const range = visibleCellRange(
        sheet,
        cellViewport,
        scrollLeft,
        scrollTop,
        this.rowOffsets,
        this.colOffsets,
      );
      scrollStartCol = range.scrollStartCol;
      endCol = range.endCol;
      scrollStartRow = range.scrollStartRow;
      endRow = range.endRow;
    } else {
      scrollStartCol = Math.max(
        freeze.col,
        searchOffset(this.colOffsets, scrollLeft + band.width),
      );
      endCol = Math.min(
        sheet.colCount - 1,
        searchOffset(this.colOffsets, scrollLeft + cellW) + 1,
      );
      scrollStartRow = Math.max(
        freeze.row,
        searchOffset(this.rowOffsets, scrollTop + band.height),
      );
      endRow = Math.min(
        sheet.rowCount - 1,
        searchOffset(this.rowOffsets, scrollTop + cellH) + 1,
      );
    }

    const borderMap = computeBorderInfoMap(sheet);
    const useBorderInfo = borderMap.size > 0 || (Array.isArray(sheet.config.borderInfo) && sheet.config.borderInfo.length > 0);
    const bdAt = (r: number, c: number): CellBorder | null => {
      if (useBorderInfo) return borderMap.get(borderKey(r, c)) ?? null;
      return sheet.getCell(r, c)?.bd ?? null;
    };

    const paintCell = (r: number, c: number) => {
      if (sheet.hiddenRows.has(r)) return;
      if (sheet.isMergeCovered(r, c)) return;
      const gridRect = getCellRect(
        sheet,
        r,
        c,
        this.rowOffsets,
        this.colOffsets,
        scrollLeft,
        scrollTop,
      );
      const rect = gridRect;
      const cell = sheet.getCell(gridRect.row, gridRect.col);
      const bd = bdAt(gridRect.row, gridRect.col);

      if (cell?.bg) {
        ctx.fillStyle = cell.bg;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }

      paintDefaultCellGridLines(ctx, rect, bd);
      paintCellBorders(ctx, rect, bd, bdAt, gridRect.row, gridRect.col);

      const text = displayValue(cell);
      const inlineRuns =
        cell?.ct?.t === "inlineStr" && cell.ct.s?.length && normalizeTr(cell.tr) === 0
          ? cell.ct.s
          : null;
      if (inlineRuns || text) {
        const fs = cell?.fs ?? 10;
        const font = cellCanvasFont(cell);
        ctx.font = font;
        ctx.fillStyle = cell?.fc ?? "#000000";
        const ht = cell?.ht ?? 1;
        const vt = cell?.vt ?? 0;
        const tb = normalizeTb(cell?.tb);
        const tr = normalizeTr(cell?.tr);
        const measureText = createCanvasMeasureText(ctx);

        let layoutWidth = rect.width;
        let layoutHeight = rect.height;
        let originX = rect.x;
        let originY = rect.y;
        let clipRect = rect;
        let skipBody = false;

        if (tb === 1 && tr === 0) {
          const span = scanOverflowSpan(sheet, gridRect.row, gridRect.col);
          if (gridRect.col !== span.startCol) {
            skipBody = true;
          } else {
            clipRect = overflowSpanSurfaceRect(
              sheet,
              gridRect.row,
              span.startCol,
              span.endCol,
              this.rowOffsets,
              this.colOffsets,
              scrollLeft,
              scrollTop,
            );
            layoutWidth = clipRect.width;
            layoutHeight = clipRect.height;
            originX = clipRect.x;
            originY = clipRect.y;
          }
        } else if (isOverflowSpanIntermediateColumn(sheet, gridRect.row, gridRect.col)) {
          skipBody = true;
        }

        if (!skipBody) {
          const layout = inlineRuns
            ? layoutInlineRuns({
                runs: inlineRuns,
                cellWidth: layoutWidth,
                cellHeight: layoutHeight,
                tb,
                ht,
                vt,
                measureText,
              })
            : layoutCellText({
                text,
                cellWidth: layoutWidth,
                cellHeight: layoutHeight,
                tb,
                tr,
                ht,
                vt,
                font,
                measureText,
              });

          ctx.save();
          ctx.beginPath();
          ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
          ctx.clip();
          paintLayoutGlyphs(ctx, layout, originX, originY, fs, cell);
          ctx.restore();
        }
      }
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      gx + band.width,
      gy + band.height,
      Math.max(0, cellW - band.width),
      Math.max(0, cellH - band.height),
    );
    ctx.clip();
    for (let r = scrollStartRow; r <= endRow; r++) {
      for (let c = scrollStartCol; c <= endCol; c++) paintCell(r, c);
    }
    ctx.restore();

    if (freeze.row > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx, gy, cellW, band.height);
      ctx.clip();
      for (let r = 0; r < freeze.row; r++) {
        for (let c = scrollStartCol; c <= endCol; c++) paintCell(r, c);
        for (let c = 0; c < freeze.col; c++) paintCell(r, c);
      }
      ctx.restore();
    }

    if (freeze.col > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx, gy + band.height, band.width, Math.max(0, cellH - band.height));
      ctx.clip();
      for (let r = scrollStartRow; r <= endRow; r++) {
        for (let c = 0; c < freeze.col; c++) paintCell(r, c);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, cellW, cellH);
    ctx.clip();

    const selections = this.workbook.selection;
    const lastIdx = selections.length - 1;
    const focusSel = selections[lastIdx];
    if (focusSel) {
      const focusRow = focusSel.row_focus ?? focusSel.row[0];
      const focusCol = focusSel.column_focus ?? focusSel.column[0];
      const focus = getCellRect(
        sheet,
        focusRow,
        focusCol,
        this.rowOffsets,
        this.colOffsets,
        scrollLeft,
        scrollTop,
      );
      ctx.fillStyle = GRID_THEME.selectionFocusFill;
      ctx.fillRect(focus.x, focus.y, focus.width, focus.height);
    }
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      const r0 = Math.min(sel.row[0], sel.row[1]);
      const r1 = Math.max(sel.row[0], sel.row[1]);
      const c0 = Math.min(sel.column[0], sel.column[1]);
      const c1 = Math.max(sel.column[0], sel.column[1]);
      const topLeft = getCellRect(
        sheet,
        r0,
        c0,
        this.rowOffsets,
        this.colOffsets,
        scrollLeft,
        scrollTop,
      );
      const bottomRight = getCellRect(
        sheet,
        r1,
        c1,
        this.rowOffsets,
        this.colOffsets,
        scrollLeft,
        scrollTop,
      );
      const sx = topLeft.x;
      const sy = topLeft.y;
      const sw = bottomRight.x + bottomRight.width - sx;
      const sh = bottomRight.y + bottomRight.height - sy;
      const isActive = i === lastIdx;

      ctx.fillStyle = isActive
        ? GRID_THEME.selectionFillActive
        : GRID_THEME.selectionFillInactive;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = isActive
        ? GRID_THEME.selectionBorder
        : GRID_THEME.selectionBorderInactive;
      ctx.lineWidth = 1;
      // 对齐原版 .luckysheet-cell-selected { margin: -1px 0 0 -1px }：
      // 左边、上边外移 1px，与行头右边框、列头下边框重合。单元格区 clip 会裁掉伸进表头的部分。
      ctx.strokeRect(sx - 0.5, sy - 0.5, sw, sh);

      if (isActive) {
        ctx.strokeStyle = GRID_THEME.fillHandleBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 2, sh - 2);

        const hx = sx + sw - (FILL_HANDLE_SIZE - FILL_HANDLE_OUTSET);
        const hy = sy + sh - (FILL_HANDLE_SIZE - FILL_HANDLE_OUTSET);
        ctx.fillStyle = GRID_THEME.fillHandleBorder;
        ctx.fillRect(hx, hy, FILL_HANDLE_SIZE, FILL_HANDLE_SIZE);
        ctx.fillStyle = GRID_THEME.fillHandleFill;
        ctx.fillRect(hx + 1, hy + 1, FILL_HANDLE_SIZE - 2, FILL_HANDLE_SIZE - 2);
      }
    }

    const copy = this.workbook.copyHighlight;
    if (copy) {
      const r0 = Math.min(copy.row[0], copy.row[1]);
      const r1 = Math.max(copy.row[0], copy.row[1]);
      const c0 = Math.min(copy.column[0], copy.column[1]);
      const c1 = Math.max(copy.column[0], copy.column[1]);
      const topLeft = getCellRect(
        sheet,
        r0,
        c0,
        this.rowOffsets,
        this.colOffsets,
        scrollLeft,
        scrollTop,
      );
      const bottomRight = getCellRect(
        sheet,
        r1,
        c1,
        this.rowOffsets,
        this.colOffsets,
        scrollLeft,
        scrollTop,
      );
      const sx = topLeft.x;
      const sy = topLeft.y;
      const sw = bottomRight.x + bottomRight.width - sx;
      const sh = bottomRight.y + bottomRight.height - sy;
      ctx.save();
      ctx.strokeStyle = GRID_THEME.selectionBorder;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = -((Date.now() / 40) % 7);
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.restore();
    }

    if (freeze.row > 0) {
      const y = gy + band.height;
      ctx.strokeStyle = GRID_THEME.selectionBorder;
      ctx.beginPath();
      ctx.moveTo(gx, y + 0.5);
      ctx.lineTo(gx + cellW, y + 0.5);
      ctx.stroke();
    }
    if (freeze.col > 0) {
      const x = gx + band.width;
      ctx.strokeStyle = GRID_THEME.selectionBorder;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, gy);
      ctx.lineTo(x + 0.5, gy + cellH);
      ctx.stroke();
    }

    ctx.restore();
    this.paintResizeGuide(ctx, w, h);
  }

  private paintHeaders(
    ctx: CanvasRenderingContext2D,
    cellViewport: { width: number; height: number },
    gx: number,
    gy: number,
  ): void {
    const layout = buildHeaderLayout(this.workbook, cellViewport);
    const cellW = cellViewport.width;
    const cellH = cellViewport.height;

    ctx.fillStyle = GRID_THEME.headerCellBg;
    ctx.fillRect(0, 0, gx, gy);
    ctx.strokeStyle = GRID_THEME.headerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - 0.5, 0);
    ctx.lineTo(gx - 0.5, gy);
    ctx.moveTo(0, gy - 0.5);
    ctx.lineTo(gx, gy - 0.5);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, 0, cellW, gy);
    ctx.clip();
    ctx.fillStyle = GRID_THEME.headerCellBg;
    ctx.fillRect(gx, 0, cellW, gy);
    ctx.font = `10pt ${luckyFontFamilyStack()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of layout.colItems) {
      const x = gx + item.offset - layout.scrollLeft;
      ctx.fillStyle = GRID_THEME.headerText;
      ctx.fillText(item.label, x + item.size / 2, gy / 2);
      ctx.strokeStyle = GRID_THEME.headerBorder;
      ctx.beginPath();
      ctx.moveTo(x + item.size - 0.5, 0);
      ctx.lineTo(x + item.size - 0.5, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = GRID_THEME.headerBorder;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 0.5);
    ctx.lineTo(gx + cellW, gy - 0.5);
    ctx.stroke();
    for (const band of layout.colSelection) {
      const x0 = gx + colLeft(this.colOffsets, band.startIndex) - layout.scrollLeft;
      const x1 =
        gx +
        (this.colOffsets[band.endIndex] ?? colLeft(this.colOffsets, band.endIndex)) -
        layout.scrollLeft;
      ctx.fillStyle = GRID_THEME.headerSelectFill;
      ctx.fillRect(x0, 0, Math.max(0, x1 - x0), gy);
      ctx.strokeStyle = GRID_THEME.headerSelectAccent;
      ctx.beginPath();
      ctx.moveTo(x0, gy - 0.5);
      ctx.lineTo(x1, gy - 0.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gy, gx, cellH);
    ctx.clip();
    ctx.fillStyle = GRID_THEME.headerCellBg;
    ctx.fillRect(0, gy, gx, cellH);
    ctx.font = `10pt ${luckyFontFamilyStack()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of layout.rowItems) {
      const y = gy + item.offset - layout.scrollTop;
      ctx.fillStyle = GRID_THEME.headerText;
      ctx.fillText(item.label, gx / 2, y + item.size / 2);
      ctx.strokeStyle = GRID_THEME.headerBorder;
      ctx.beginPath();
      ctx.moveTo(0, y + item.size - 0.5);
      ctx.lineTo(gx, y + item.size - 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = GRID_THEME.headerBorder;
    ctx.beginPath();
    ctx.moveTo(gx - 0.5, gy);
    ctx.lineTo(gx - 0.5, gy + cellH);
    ctx.stroke();
    for (const band of layout.rowSelection) {
      const y0 = gy + rowTop(this.rowOffsets, band.startIndex) - layout.scrollTop;
      const y1 =
        gy +
        (this.rowOffsets[band.endIndex] ?? rowTop(this.rowOffsets, band.endIndex)) -
        layout.scrollTop;
      ctx.fillStyle = GRID_THEME.headerSelectFill;
      ctx.fillRect(0, y0, gx, Math.max(0, y1 - y0));
      ctx.strokeStyle = GRID_THEME.headerSelectAccent;
      ctx.beginPath();
      ctx.moveTo(gx - 0.5, y0);
      ctx.lineTo(gx - 0.5, y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  private paintResizeGuide(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const guide = this.headerResizeGuide;
    if (!guide) return;
    ctx.save();
    ctx.strokeStyle = GRID_THEME.headerSelectAccent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (guide.axis === "col") {
      ctx.moveTo(guide.position + 0.5, 0);
      ctx.lineTo(guide.position + 0.5, height);
    } else {
      ctx.moveTo(0, guide.position + 0.5);
      ctx.lineTo(width, guide.position + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  getContentSize(): { width: number; height: number } {
    return contentSize(this.rowOffsets, this.colOffsets);
  }
}

/** Luckysheet draws only right + bottom per cell (strokeStyle #dfdfdf) to avoid double lines */
function paintDefaultCellGridLines(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  bd: CellBorder | null,
): void {
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;
  const left = x0 + 0.5;
  const right = x1 - 0.5;
  const top = y0 + 0.5;
  const bottom = y1 - 0.5;
  const vY0 = bd?.t ? top : y0;
  const vY1 = bd?.b ? bottom : y1;
  const hX0 = bd?.l ? left : x0;
  const hX1 = bd?.r ? right : x1;
  ctx.strokeStyle = GRID_THEME.cellGridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(right, vY0);
  ctx.lineTo(right, vY1);
  ctx.moveTo(hX0, bottom);
  ctx.lineTo(hX1, bottom);
  ctx.stroke();
}

function strokeBorderSide(
  ctx: CanvasRenderingContext2D,
  side: NonNullable<CellBorder[keyof CellBorder]>,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const { lineWidth, dash, dual, mediumAlign } = borderLineStroke(side.style ?? 1);
  ctx.strokeStyle = side.color || "#000000";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.setLineDash(dash);

  const horizontal = Math.abs(y2 - y1) < 1e-6;
  let ax1 = x1;
  let ay1 = y1;
  let ax2 = x2;
  let ay2 = y2;
  // Lucky Medium*: shift cross-axis by 0.5 so 2px stroke sits on pixel grid
  if (mediumAlign) {
    if (horizontal) {
      ay1 -= 0.5;
      ay2 -= 0.5;
    } else {
      ax1 -= 0.5;
      ax2 -= 0.5;
    }
  }

  const strokeSeg = (sx1: number, sy1: number, sx2: number, sy2: number) => {
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  };

  if (dual) {
    // Double: two 1px parallels offset ±1 on the cross-axis
    if (horizontal) {
      strokeSeg(ax1, ay1 - 1, ax2, ay2 - 1);
      strokeSeg(ax1, ay1 + 1, ax2, ay2 + 1);
    } else {
      strokeSeg(ax1 - 1, ay1, ax2 - 1, ay2);
      strokeSeg(ax1 + 1, ay1, ax2 + 1, ay2);
    }
  } else {
    strokeSeg(ax1, ay1, ax2, ay2);
  }

  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

/** 与 paintDefaultCellGridLines 同一套边坐标，竖边向上多 1px（对齐 Luckysheet border*Render） */
function borderEdgeCoords(rect: { x: number; y: number; width: number; height: number }) {
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;
  const left = x0 + 0.5;
  const right = x1 - 0.5;
  const top = y0 + 0.5;
  const bottom = y1 - 0.5;
  return { left, right, top, bottom, y0, y1 };
}

function willDrawTop(
  bdAt: (r: number, c: number) => CellBorder | null,
  row: number,
  col: number,
): boolean {
  const bd = bdAt(row, col);
  if (!bd?.t) return false;
  const aboveBd = row > 0 ? bdAt(row - 1, col) : null;
  return !aboveBd?.b;
}

function willDrawLeft(
  bdAt: (r: number, c: number) => CellBorder | null,
  row: number,
  col: number,
): boolean {
  const bd = bdAt(row, col);
  if (!bd?.l) return false;
  const leftBd = col > 0 ? bdAt(row, col - 1) : null;
  return !leftBd?.r;
}

function paintCellBorders(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  bd: CellBorder | null,
  bdAt: (r: number, c: number) => CellBorder | null,
  row: number,
  col: number,
): void {
  if (!bd) return;
  const draw = (
    side: NonNullable<CellBorder[keyof CellBorder]> | undefined,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    if (!side) return;
    strokeBorderSide(ctx, side, x1, y1, x2, y2);
  };
  const aboveBd = row > 0 ? bdAt(row - 1, col) : null;
  const leftBd = col > 0 ? bdAt(row, col - 1) : null;
  const { left, right, top, bottom, y0, y1 } = borderEdgeCoords(rect);
  const drawTop = !!(bd.t && !aboveBd?.b);
  const vTop = drawTop ? top : aboveBd?.b ? y0 - 1 : y0;
  const belowDrawsRight = !!bdAt(row + 1, col)?.r;
  const belowDrawsLeft = willDrawLeft(bdAt, row + 1, col);
  const belowStartsAtTop = willDrawTop(bdAt, row + 1, col);
  const vBottomRight =
    belowDrawsRight && belowStartsAtTop ? y1 + 0.5 : bd.b ? bottom : y1;
  const vBottomLeft =
    belowDrawsLeft && belowStartsAtTop ? y1 + 0.5 : bd.b ? bottom : y1;
  const nextLeftX = rect.x + rect.width + 0.5;
  if (drawTop) {
    const hEnd = willDrawTop(bdAt, row, col + 1) ? nextLeftX : right;
    draw(bd.t, left, top, hEnd, top);
  }
  if (bd.b) {
    const hEnd = bdAt(row, col + 1)?.b ? nextLeftX : right;
    draw(bd.b, left, bottom, hEnd, bottom);
  }
  if (bd.l && !leftBd?.r) draw(bd.l, left, vTop, left, vBottomLeft);
  draw(bd.r, right, vTop, right, vBottomRight);
}
