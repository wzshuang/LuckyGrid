import { describe, expect, it } from "vitest";
import { CanvasRenderer } from "../src/render/canvas-renderer.js";
import { GRID_THEME } from "../src/render/grid-theme.js";
import { WorkbookEngine } from "../src/engine.js";
import {
  COL_HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
} from "../src/hit/location.js";
import { DEFAULT_COL_LEN, DEFAULT_ROW_LEN } from "../src/model/sheet.js";

type StrokeRect = { x: number; y: number; w: number; h: number; strokeStyle: string };
type Line = { x1: number; y1: number; x2: number; y2: number; strokeStyle: string };

function createMockCanvas() {
  const strokeRects: StrokeRect[] = [];
  const lines: Line[] = [];
  let strokeStyle = "";
  let lineWidth = 1;
  let pen = { x: 0, y: 0 };
  const ctx = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "strokeRect") {
          return (x: number, y: number, w: number, h: number) => {
            strokeRects.push({ x, y, w, h, strokeStyle });
          };
        }
        if (prop === "moveTo") {
          return (x: number, y: number) => {
            pen = { x, y };
          };
        }
        if (prop === "lineTo") {
          return (x: number, y: number) => {
            lines.push({ x1: pen.x, y1: pen.y, x2: x, y2: y, strokeStyle });
            pen = { x, y };
          };
        }
        if (prop === "measureText") return () => ({ width: 0 });
        if (prop === "strokeStyle") return strokeStyle;
        if (prop === "lineWidth") return lineWidth;
        return () => {};
      },
      set(_target, prop, value) {
        if (prop === "strokeStyle") strokeStyle = String(value);
        if (prop === "lineWidth") lineWidth = Number(value);
        return true;
      },
    },
  );
  const canvas = {
    style: {},
    width: 0,
    height: 0,
    getContext: () => ctx,
  };
  return { canvas, strokeRects, lines };
}

function paintSelection(column: number) {
  const eng = new WorkbookEngine();
  eng.workbook.setSelection([{ row: [0, 0], column: [column, column] }]);
  const mock = createMockCanvas();
  const renderer = new CanvasRenderer(eng.workbook, mock.canvas as unknown as HTMLCanvasElement);
  renderer.resize(800, 600);
  renderer.paint({ width: 800, height: 600 });
  const border = mock.strokeRects.find((s) => s.strokeStyle === GRID_THEME.selectionBorder);
  const rowAccent = mock.lines.find(
    (l) => l.strokeStyle === GRID_THEME.headerSelectAccent && l.x1 === l.x2,
  );
  const colAccent = mock.lines.find(
    (l) => l.strokeStyle === GRID_THEME.headerSelectAccent && l.y1 === l.y2,
  );
  const inner = mock.strokeRects.find((s) => s.strokeStyle === GRID_THEME.fillHandleBorder);
  return { border, rowAccent, colAccent, inner, strokeRects: mock.strokeRects };
}

describe("selection frame vs header accent", () => {
  it("shares the row-header right edge and column-header bottom edge on the first cell", () => {
    const { border, rowAccent, colAccent, inner } = paintSelection(0);
    expect(rowAccent).toBeDefined();
    expect(colAccent).toBeDefined();
    expect(border).toMatchObject({
      x: ROW_HEADER_WIDTH - 0.5,
      y: COL_HEADER_HEIGHT - 0.5,
      w: DEFAULT_COL_LEN,
      h: DEFAULT_ROW_LEN,
    });
    expect(border!.x).toBe(rowAccent!.x1);
    expect(border!.y).toBe(colAccent!.y1);
    expect(inner).toMatchObject({
      x: ROW_HEADER_WIDTH + 0.5,
      y: COL_HEADER_HEIGHT + 0.5,
      w: DEFAULT_COL_LEN - 2,
      h: DEFAULT_ROW_LEN - 2,
    });
  });

  it("keeps the left border inside the cell area when the cell is not in column A", () => {
    const { border, rowAccent } = paintSelection(1);
    expect(border).toMatchObject({
      x: ROW_HEADER_WIDTH + DEFAULT_COL_LEN - 0.5,
      y: COL_HEADER_HEIGHT - 0.5,
      w: DEFAULT_COL_LEN,
      h: DEFAULT_ROW_LEN,
    });
    expect(border!.x).toBeGreaterThan(rowAccent!.x1);
  });
});
