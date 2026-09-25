# 文本换行与文本旋转 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐工具栏文本换行 / 文本旋转拆分按钮，写入 Lucky 兼容 `tb`/`tr`，用 Core 统一 `text-layout` 驱动 Canvas 绘制（含跨格溢出）与选区/编辑后的行高重算。

**Architecture:** `@luckysheet3/core` 新增 `text/` 模块（`layoutCellText`、`scanOverflowSpan`、`measureRowHeight`）。`setStyle` 扩展 `tb`/`tr`；选区样式走 structural `setStyleRange`（样式 + 行高一步撤销）。Canvas 消费 layout 结果。Vue 新增两个拆分按钮，交互对齐 `ToolbarAlignSplit`。

**Tech Stack:** TypeScript、Vitest（`@luckysheet3/core`）、Vue 3 SFC、`node:test`（vue 结构测试）、pnpm workspace。

**Spec:** `docs/superpowers/specs/2026-09-28-toolbar-text-wrap-rotate-design.md`

## Global Constraints

- `tb`/`tr` 存 **数字**：`tb` 0 截断 / 1 溢出 / 2 自动换行；`tr` 0–5 对应六种旋转
- 跨格溢出 **仅** `tb===1 && tr===0`；有旋转时本格 clip
- 行高触发：含 `tb`/`tr`/`fs` 的样式应用，以及 `setCellValue` / 编辑提交
- 工具栏状态跟活动单元格同步（同对齐，非边框会话记忆）
- 空选区：`applyStyleToSelection` 静默 return
- 不做全表启动行高扫描、不做 inlineString、不做像素截图回归
- 不做 `extras` → `tb`/`tr` 提升或历史迁移；单元格 JSON 直接带一等字段即可
- 提交信息用中文 `feat:` / `test:` / `docs:`；每任务末尾 commit **仅当用户明确要求提交时执行**
- 对照原版：`http://localhost:5173/luckysheet-original/`（需 sibling demo）

## File Map

| 文件 | 职责 |
|------|------|
| `packages/core/src/model/cell.ts` | `CellStyle` 增加 `tb?` `tr?` |
| `packages/core/src/text/types.ts` | layout 输入输出类型、`TextWrapMode`/`TextRotateMode` |
| `packages/core/src/text/tb-tr.ts` | 菜单字符串 ↔ 数字、角度映射、缺省值 |
| `packages/core/src/text/text-layout.ts` | `layoutCellText` |
| `packages/core/src/text/overflow.ts` | `scanOverflowSpan` |
| `packages/core/src/text/row-height.ts` | `measureRowHeight` / `recalcRowHeights` |
| `packages/core/src/command/types.ts` | `setStyle` 含 `tb`/`tr`；新增 `setStyleRange` |
| `packages/core/src/command/bus.ts` | `setStyleRange` structural；`setCellValue` 同步行高 |
| `packages/core/src/engine.ts` | `applyStyleToSelection` 走 `setStyleRange` |
| `packages/core/src/clipboard/style.ts` | `FORMAT_KEYS` 含 `tb`/`tr` |
| `packages/core/src/render/canvas-renderer.ts` | 用 layout 绘制正文 / 溢出 |
| `packages/core/src/index.ts` | 导出公开 API |
| `packages/core/tests/tb-tr.spec.ts` | 映射单测 |
| `packages/core/tests/text-layout.spec.ts` | 断行 / 旋转 / 竖排 |
| `packages/core/tests/overflow-row-height.spec.ts` | 溢出扫描与行高 |
| `packages/core/tests/text-style-commands.spec.ts` | setStyleRange / 撤销 / 格式刷 |
| `packages/vue/src/components/ToolbarTextWrapSplit.vue` | 换行拆分按钮 |
| `packages/vue/src/components/ToolbarTextRotateSplit.vue` | 旋转拆分按钮 |
| `packages/vue/src/components/Toolbar.vue` | 接入 + 菜单互斥 |
| `packages/vue/tests/toolbar-style.test.mjs` | 结构断言 |
| `docs/FEATURE_MAP.md` | 自动换行/旋转 → usable |

---

### Task 1: `tb`/`tr` 类型与映射

**Files:**
- Modify: `packages/core/src/model/cell.ts`
- Create: `packages/core/src/text/types.ts`
- Create: `packages/core/src/text/tb-tr.ts`
- Create: `packages/core/tests/tb-tr.spec.ts`
- Modify: `packages/core/src/command/types.ts`（仅 `setStyle` 的 Pick）
- Modify: `packages/core/src/clipboard/style.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `CellStyle.tb?: number`、`CellStyle.tr?: number`
- Produces: `normalizeTb(v: unknown): 0 \| 1 \| 2`（非法 → `0`）
- Produces: `normalizeTr(v: unknown): 0 \| 1 \| 2 \| 3 \| 4 \| 5`（非法 → `0`）
- Produces: `tbFromMenu(id: "overflow" \| "wrap" \| "clip"): 0 \| 1 \| 2`
- Produces: `trFromMenu(id: "none" \| "angleup" \| "angledown" \| "vertical" \| "rotation-up" \| "rotation-down"): 0..5`
- Produces: `rotationAngleDeg(tr: number): number` — `0→0`，`1→45`，`2→-45`，`4→90`，`5→-90`，`3→0`（竖排不用角度）
- Produces: `isVerticalText(tr: number): boolean` — `tr===3`
- Produces: `FORMAT_KEYS` 含 `"tb"` `"tr"`

- [ ] **Step 1: 写失败测试**

`packages/core/tests/tb-tr.spec.ts`：

```ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @luckysheet3/core test -- tests/tb-tr.spec.ts`  
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现类型与映射**

在 `cell.ts` 的 `CellStyle` 末尾（`vt` 后、`bd` 前）加：

```ts
  /** text wrap: 0 clip, 1 overflow, 2 wrap */
  tb?: number;
  /** text rotate: 0 none … 5 rotation-down */
  tr?: number;
```

`packages/core/src/text/types.ts`：

```ts
export type TextWrapMode = 0 | 1 | 2;
export type TextRotateMode = 0 | 1 | 2 | 3 | 4 | 5;

export type MeasureTextFn = (text: string, font: string) => { width: number; height: number };

export type TextGlyph = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CellTextLayout = {
  glyphs: TextGlyph[];
  contentWidth: number;
  contentHeight: number;
  angleDeg: number;
  /** true when cross-cell overflow drawing is allowed */
  overflow: boolean;
};
```

`packages/core/src/text/tb-tr.ts`：实现 Step 1 接口；`normalizeTb`/`normalizeTr` 接受 number 或数字字符串。

`command/types.ts` 的 `setStyle.style` Pick 增加 `"cl" | "un" | "tb" | "tr"`（与 engine 已有 `cl`/`un` 对齐并补 `tb`/`tr`）。

`clipboard/style.ts` 的 `CellFormat` 与 `FORMAT_KEYS` 增加 `"tb"` `"tr"`。

`index.ts` 导出 `tb-tr` 与 `types` 中公开符号。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @luckysheet3/core test -- tests/tb-tr.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**（仅当用户要求）

```bash
git add packages/core/src/model/cell.ts packages/core/src/text packages/core/src/command/types.ts packages/core/src/clipboard/style.ts packages/core/src/index.ts packages/core/tests/tb-tr.spec.ts
git commit -m "feat(core): 增加 tb/tr 字段与菜单映射"
```

---

### Task 2: `layoutCellText` 断行与旋转

**Files:**
- Create: `packages/core/src/text/text-layout.ts`
- Create: `packages/core/tests/text-layout.spec.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `normalizeTb`、`normalizeTr`、`rotationAngleDeg`、`isVerticalText`、`MeasureTextFn`、`CellTextLayout`
- Produces:

```ts
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

export function layoutCellText(input: LayoutCellTextInput): CellTextLayout;
```

约定：
- `tb=2`：按 `cellWidth - 2*paddingX` 贪心断行；`\n` 强制换行；每字宽度用 `measureText`
- `tb=0|1`：不按宽度断行（仍尊重 `\n`）；`contentWidth` 为最宽行
- `tr=3`：逐 Unicode 码点竖排，忽略水平 wrap，纵向累加 `contentHeight`
- 其它 `tr`：`angleDeg = rotationAngleDeg(tr)`；先水平排再标角度（glyph 坐标为未旋转局部坐标，原点在对齐后的锚点）
- `overflow` 字段：`normalizeTb(tb)===1 && normalizeTr(tr)===0`

- [ ] **Step 1: 写失败测试**

`packages/core/tests/text-layout.spec.ts`：

```ts
import { describe, expect, it } from "vitest";
import { layoutCellText } from "../src/text/text-layout.js";

const measure =
  (charW = 10, lineH = 12): typeof import("../src/text/types.js").MeasureTextFn =>
  (text) => ({ width: text.length * charW, height: lineH });

describe("layoutCellText", () => {
  it("wraps by width when tb=2", () => {
    const layout = layoutCellText({
      text: "abcdefgh",
      cellWidth: 45,
      cellHeight: 40,
      tb: 2,
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    // usable width ~41 → 4 chars/line → 2 lines
    expect(layout.glyphs.length).toBeGreaterThan(1);
    expect(layout.contentHeight).toBeGreaterThan(12);
    expect(layout.overflow).toBe(false);
  });

  it("honors explicit newlines when wrapping", () => {
    const layout = layoutCellText({
      text: "ab\ncd",
      cellWidth: 200,
      cellHeight: 40,
      tb: 2,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    const ys = new Set(layout.glyphs.map((g) => g.y));
    expect(ys.size).toBe(2);
  });

  it("does not wrap for overflow mode but marks overflow", () => {
    const layout = layoutCellText({
      text: "abcdefghij",
      cellWidth: 30,
      cellHeight: 19,
      tb: 1,
      tr: 0,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    expect(layout.contentWidth).toBe(100);
    expect(layout.overflow).toBe(true);
  });

  it("clip mode does not mark overflow", () => {
    const layout = layoutCellText({
      text: "abcdefghij",
      cellWidth: 30,
      cellHeight: 19,
      tb: 0,
      font: "10pt sans-serif",
      measureText: measure(),
    });
    expect(layout.overflow).toBe(false);
  });

  it("sets angle for tilt and 90deg", () => {
    expect(
      layoutCellText({
        text: "A",
        cellWidth: 40,
        cellHeight: 40,
        tr: 1,
        font: "10pt sans-serif",
        measureText: measure(),
      }).angleDeg,
    ).toBe(45);
    expect(
      layoutCellText({
        text: "A",
        cellWidth: 40,
        cellHeight: 40,
        tr: 5,
        font: "10pt sans-serif",
        measureText: measure(),
      }).angleDeg,
    ).toBe(-90);
  });

  it("stacks glyphs vertically for tr=3", () => {
    const layout = layoutCellText({
      text: "AB",
      cellWidth: 40,
      cellHeight: 80,
      tr: 3,
      font: "10pt sans-serif",
      measureText: measure(10, 12),
    });
    expect(layout.glyphs).toHaveLength(2);
    expect(layout.glyphs[1]!.y).toBeGreaterThan(layout.glyphs[0]!.y);
    expect(layout.angleDeg).toBe(0);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @luckysheet3/core test -- tests/text-layout.spec.ts`  
Expected: FAIL

- [ ] **Step 3: 实现 `layoutCellText`**

实现要点（保持文件可测、可独立阅读）：

1. 用 `normalizeTb`/`normalizeTr`。
2. 水平模式：按行拆分 → 每行再按宽度断（仅 `tb=2`）→ 得到 `string[]` lines。
3. 每行一个或多个 glyph（可一行一个 glyph，旋转/装饰更简单；竖排必须一字一 glyph）。
4. 按 `ht`/`vt` 把行盒放进 `cellWidth`×`cellHeight`（局部坐标，左上为 0,0）。
5. 竖排：字符从上到下，水平按 `ht` 居中/左右。
6. `contentWidth`/`contentHeight` 为内容包围盒（含 padding 外的纯内容），供行高使用。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @luckysheet3/core test -- tests/text-layout.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**（仅当用户要求）

```bash
git add packages/core/src/text/text-layout.ts packages/core/tests/text-layout.spec.ts packages/core/src/index.ts
git commit -m "feat(core): layoutCellText 支持换行与旋转布局"
```

---

### Task 3: 溢出扫描与行高测量

**Files:**
- Create: `packages/core/src/text/overflow.ts`
- Create: `packages/core/src/text/row-height.ts`
- Create: `packages/core/tests/overflow-row-height.spec.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Sheet`、`layoutCellText`、`displayValue`、`DEFAULT_ROW_LEN`、`MeasureTextFn`
- Produces:

```ts
export function scanOverflowSpan(
  sheet: Sheet,
  row: number,
  col: number,
): { startCol: number; endCol: number };

export function measureRowHeight(
  sheet: Sheet,
  row: number,
  measureText: MeasureTextFn,
): number;

export function recalcRowHeights(
  sheet: Sheet,
  rows: Iterable<number>,
  measureText: MeasureTextFn,
): void;
```

规则：
- `scanOverflowSpan`：从 `col` 向右，下一格「空」才延伸。空 = `displayValue` 为空且非合并覆盖（`isMergeCovered`）且不是另一合并块起点挡住。遇非空或 `colCount` 边界停。返回 `{ startCol: col, endCol }`。
- 若本格是合并主格，起始占宽用合并 `cs`；扫描从合并块右边界下一列开始。
- `measureRowHeight`：遍历该行所有列；跳过 `isMergeCovered`；对有显示文本或 `tb===2` 的格调用 `layoutCellText`（`cellWidth`/`cellHeight` 用合并后几何或单格宽高）；取 `max(DEFAULT_ROW_LEN, max(contentHeight + 2*paddingY))`。
- `recalcRowHeights`：对每个 row `sheet.setRowHeight(row, measureRowHeight(...))`。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";
import { scanOverflowSpan } from "../src/text/overflow.js";
import { measureRowHeight, recalcRowHeights } from "../src/text/row-height.js";
import { DEFAULT_ROW_LEN } from "../src/model/sheet.js";

const measure = (text: string) => ({ width: text.length * 10, height: 12 });

describe("scanOverflowSpan", () => {
  it("extends through empty cells and stops at content", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "long" });
    eng.execute({ type: "setCellValue", row: 0, col: 3, value: "x" });
    const sheet = eng.workbook.activeSheet;
    expect(scanOverflowSpan(sheet, 0, 0)).toEqual({ startCol: 0, endCol: 2 });
  });
});

describe("measureRowHeight", () => {
  it("grows for wrapped text", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setStyle",
      row: 0,
      col: 0,
      style: { tb: 2, fs: 10 },
    });
    eng.execute({
      type: "setCellValue",
      row: 0,
      col: 0,
      value: "abcdefghijklmnop",
    });
    const h = measureRowHeight(eng.workbook.activeSheet, 0, measure);
    expect(h).toBeGreaterThan(DEFAULT_ROW_LEN);
  });

  it("recalcRowHeights writes config.rowlen", () => {
    const eng = new WorkbookEngine();
    eng.execute({
      type: "setCellValue",
      row: 1,
      col: 0,
      value: "abcdefghijklmnop",
    });
    eng.execute({ type: "setStyle", row: 1, col: 0, style: { tb: 2 } });
    recalcRowHeights(eng.workbook.activeSheet, [1], measure);
    expect(eng.workbook.activeSheet.getRowHeight(1)).toBeGreaterThan(DEFAULT_ROW_LEN);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @luckysheet3/core test -- tests/overflow-row-height.spec.ts`  
Expected: FAIL

- [ ] **Step 3: 实现 overflow + row-height**

`row-height.ts` 内组装 `font` 字符串与现 renderer 一致：`` `${it} ${bl}${fs}pt sans-serif` ``（`fs` 默认 10）。`cellWidth` = `sheet.getColWidth(c)`（合并则累加列宽）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @luckysheet3/core test -- tests/overflow-row-height.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**（仅当用户要求）

```bash
git add packages/core/src/text/overflow.ts packages/core/src/text/row-height.ts packages/core/tests/overflow-row-height.spec.ts packages/core/src/index.ts
git commit -m "feat(core): 溢出列扫描与行高测量"
```

---

### Task 4: 命令与 Engine（一步撤销 + 行高）

**Files:**
- Modify: `packages/core/src/command/types.ts`
- Modify: `packages/core/src/command/bus.ts`
- Modify: `packages/core/src/engine.ts`
- Create: `packages/core/tests/text-style-commands.spec.ts`

**Interfaces:**
- Produces: 新命令

```ts
| {
    type: "setStyleRange";
    row: number;
    col: number;
    rowCount: number;
    colCount: number;
    style: Partial<
      Pick<CellData, "bg" | "fc" | "bl" | "it" | "cl" | "un" | "fs" | "ff" | "ht" | "vt" | "tb" | "tr">
    >;
    sheetIndex?: string | number;
  }
```

- `STRUCTURAL` 加入 `"setStyleRange"`
- `applyStyleToSelection(style)` → 对每个选区发一条 `setStyleRange`（多选区则多条；单选区一步含全部单元格）
- `setStyleRange` 在 `applyStructural` 回调内：`patchCell` 选区每格；若 `style` 含 `tb`|`tr`|`fs`，对涉及行 `recalcRowHeights`
- `applySetCellValue`：写值后对该行 `recalcRowHeights`；`inverse` 增加 `prevHeight`；`applyInverse` 在恢复 `prevCell` 后若有 `prevHeight` 则 `setRowHeight`
- 浏览器测量：engine 持有可选 `measureText`；默认用 OffscreenCanvas/ document canvas；测试可 `eng.setMeasureText(fn)`
- Produces: `WorkbookEngine.setMeasureText(fn: MeasureTextFn): void`

行高测量在 Node 单测无真实 Canvas 时必须可注入假 `measureText`。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from "vitest";
import { WorkbookEngine } from "../src/engine.js";
import { DEFAULT_ROW_LEN } from "../src/model/sheet.js";
import { applyFormat, stripValue } from "../src/clipboard/style.js";

const measure = (text: string) => ({ width: text.length * 10, height: 12 });

describe("text style commands", () => {
  it("applyStyleToSelection writes tb/tr", () => {
    const eng = new WorkbookEngine();
    eng.setMeasureText(measure);
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 0] }],
    });
    eng.applyStyleToSelection({ tb: 2, tr: 1 });
    const cell = eng.workbook.getCell(0, 0);
    expect(cell?.tb).toBe(2);
    expect(cell?.tr).toBe(1);
  });

  it("wrap style raises row height and undoes in one step", () => {
    const eng = new WorkbookEngine();
    eng.setMeasureText(measure);
    eng.execute({ type: "setCellValue", row: 0, col: 0, value: "abcdefghijklmnop" });
    eng.execute({
      type: "setSelection",
      selection: [{ row: [0, 0], column: [0, 0] }],
    });
    const before = eng.workbook.activeSheet.getRowHeight(0);
    eng.applyStyleToSelection({ tb: 2 });
    expect(eng.workbook.activeSheet.getRowHeight(0)).toBeGreaterThan(before);
    eng.undo();
    expect(eng.workbook.getCell(0, 0)?.tb).toBeUndefined();
    expect(eng.workbook.activeSheet.getRowHeight(0)).toBe(before);
  });

  it("edit commit recalculates wrap row height", () => {
    const eng = new WorkbookEngine();
    eng.setMeasureText(measure);
    eng.execute({ type: "setStyle", row: 0, col: 0, style: { tb: 2 } });
    eng.execute({
      type: "setCellValue",
      row: 0,
      col: 0,
      value: "abcdefghijklmnop",
    });
    expect(eng.workbook.activeSheet.getRowHeight(0)).toBeGreaterThan(DEFAULT_ROW_LEN);
    eng.undo();
    expect(eng.workbook.activeSheet.getRowHeight(0)).toBe(DEFAULT_ROW_LEN);
  });

  it("paint format copies tb/tr", () => {
    const fmt = stripValue({ v: 1, tb: 2, tr: 4 } as never);
    const next = applyFormat({ v: "x" }, fmt);
    expect(next?.tb).toBe(2);
    expect(next?.tr).toBe(4);
  });
});
```

注意：若 `setStyle` 单格路径尚未触发行高，测试里「edit commit」依赖 `setCellValue` 路径；「wrap style」依赖 `setStyleRange`。单格 `setStyle` 可不抬行高（工具栏一律走 `applyStyleToSelection` → `setStyleRange`）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @luckysheet3/core test -- tests/text-style-commands.spec.ts`  
Expected: FAIL

- [ ] **Step 3: 实现命令与 engine**

1. `types.ts` 增加 `setStyleRange`；扩展 `setStyle` Pick。
2. `bus.ts`：`STRUCTURAL.add("setStyleRange")`；`case "setStyleRange"` → `applyStructural` 内 patch + 条件 `recalcRowHeights`。
3. `applySetCellValue` 末尾：`recalcRowHeights(sheet, [row], this.measureText)`；记录 `prevHeight = sheet.getRowHeight(row)`（在写入前读）；inverse 带上。
4. `applyInverse`：`setCellValue` 恢复 cell 后若 `entry.prevHeight != null` 则 `setRowHeight`。
5. `engine.ts`：
   - `private measureTextFn: MeasureTextFn` + `setMeasureText`
   - 默认实现：尝试 `document.createElement("canvas").getContext("2d")`，用 `ctx.measureText`；`height` 取 `fs * 1.2` 或 `actualBoundingBoxAscent+Descent` 兜底
   - `applyStyleToSelection`：循环选区，`execute({ type: "setStyleRange", ... })`，把 `this.measureTextFn` 经 workbook/bus 可访问——**做法**：在 `CommandBus` 上设 `measureText` 属性，engine 构造后同步；`recalcRowHeights` 读 `this.measureText`

```ts
// engine.applyStyleToSelection 核心
applyStyleToSelection(style: Partial<Pick<CellData, /* ... + tb tr */>>): void {
  const sel = this.getActiveRange();
  if (!sel) return;
  // 对 workbook.selection 每个 range：
  const r0 = Math.min(...); // 同现逻辑
  this.execute({
    type: "setStyleRange",
    row: r0,
    col: c0,
    rowCount: r1 - r0 + 1,
    colCount: c1 - c0 + 1,
    style,
  });
}
```

多选区：对 `this.workbook.selection` 每段各 `execute` 一次（每段一步撤销；可接受。若只要整次工具栏一步，可合并为一次 structural 含多 range——YAGNI：先每选区一步，单选区为常见路径）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @luckysheet3/core test -- tests/text-style-commands.spec.ts`  
Expected: PASS  
另跑：`pnpm --filter @luckysheet3/core test` 确保未破坏 `format`/`commands`/`paint-format`

- [ ] **Step 5: Commit**（仅当用户要求）

```bash
git add packages/core/src/command packages/core/src/engine.ts packages/core/tests/text-style-commands.spec.ts
git commit -m "feat(core): setStyleRange 与编辑提交触发行高并一步撤销"
```

---

### Task 5: Canvas 渲染接入 layout

**Files:**
- Modify: `packages/core/src/render/canvas-renderer.ts`
- Modify: `packages/core/tests/text-layout.spec.ts`（可补「clip 坐标在格内」类纯函数断言；渲染用 layout 契约即可）

**Interfaces:**
- Consumes: `layoutCellText`、`scanOverflowSpan`、`displayValue`、`normalizeTb`、`normalizeTr`

绘制替换 `paintCell` 内现有单行 `fillText` 块：

1. 构造 `font` / `measureText`（用同一 ctx：`measureText: (t, font) => { ctx.font=font; const m=ctx.measureText(t); return { width:m.width, height: ... } }`）。
2. `layout = layoutCellText({ text, cellWidth: rect.width, cellHeight: rect.height, tb, tr, ht, vt, font, measureText })`。
3. 若 `layout.overflow`：
   - `span = scanOverflowSpan(sheet, r, c)`
   - 若当前 `c !== span.endCol`：跳过正文（仍画 bg/边框）
   - 若 `c === span.endCol`：计算从 `span.startCol` 到 `endCol` 的合并矩形（surface），`clip` 后把 layout 锚到 **起始格** 左上（需按 startCol 的格子原点重算 layout，或 layout 时用 span 总宽）。**推荐**：仅在 `c === startCol` 时绘制溢出正文，clip 到 span 宽×行高；中间列与 endCol 若不是 startCol 则跳过正文。与原版「末列绘制」等价的可测约定：**本实现改为在 startCol 绘制**（更简单），clip 宽 = 连续空列总宽；中间列跳过正文。在计划与注释中写明与原版「末列画」的差异仅锚点列不同，视觉一致。
4. 非溢出：`ctx.save(); ctx.beginPath(); ctx.rect(rect...); ctx.clip();` 然后画 glyphs。
5. 每个 glyph：若 `angleDeg!==0`，`translate(anchor+glyph); rotate; fillText; restore`；竖排无 rotate。
6. 下划线/删除线：对每个 glyph 调用现有 `paintTextDecorations`（或按行合并）。

- [ ] **Step 1: 写契约测试（可选加强）**

在 `text-layout.spec.ts` 增加：溢出 layout 的 `overflow===true` 且 `tr!==0` 时为 false（已有）。无需 canvas 截图。

- [ ] **Step 2: 改 `paintCell` 文本分支**

按上列 1–6 替换；保留 bg / 网格 / 边框顺序不变。

- [ ] **Step 3: 跑 core 全量测试**

Run: `pnpm --filter @luckysheet3/core test`  
Expected: PASS

- [ ] **Step 4: 手工快速看**（可选）`pnpm dev` 设 `tb=2` 长文本是否多行

- [ ] **Step 5: Commit**（仅当用户要求）

```bash
git add packages/core/src/render/canvas-renderer.ts packages/core/tests/text-layout.spec.ts
git commit -m "feat(core): Canvas 按 text-layout 绘制换行/溢出/旋转"
```

---

### Task 6: Vue 换行 / 旋转拆分按钮

**Files:**
- Create: `packages/vue/src/components/ToolbarTextWrapSplit.vue`
- Create: `packages/vue/src/components/ToolbarTextRotateSplit.vue`
- Modify: `packages/vue/src/components/Toolbar.vue`
- Modify: `packages/vue/tests/toolbar-style.test.mjs`

**Interfaces:**
- Consumes: `engine.applyStyleToSelection`、`engine.getActiveCellStyle`、`chrome.styleRev`
- Props 同对齐：`engine`、`chrome`、`open`；`update:open`

菜单常量：

```ts
// Wrap
const ITEMS = [
  { icon: "yichu1", title: "溢出", value: 1 },
  { icon: "zidonghuanhang", title: "自动换行", value: 2 },
  { icon: "jieduan", title: "截断", value: 0 },
];
const DEFAULT_TB = 0;

// Rotate
const ITEMS = [
  { icon: "wuxuanzhuang", title: "无旋转", value: 0 },
  { icon: "xiangshangqingxie", title: "向上倾斜", value: 1 },
  { icon: "xiangxiaqingxie", title: "向下倾斜", value: 2 },
  { icon: "shupaiwenzi", title: "竖排文字", value: 3 },
  { icon: "wenbenxiangshang", title: "向上90°", value: 4 },
  { icon: "xiangxia90", title: "向下90°", value: 5 },
];
const DEFAULT_TR = 0;
```

结构复制 `ToolbarAlignSplit.vue`：左键 `apply(currentValue)`，菜单 `onPick`，`ToolbarMenuCheck`，document pointerdown / Escape 关闭。

`Toolbar.vue`：
- `openTextMenu = ref<null | "wrap" | "rotate">(null)`
- 在垂直对齐之后、插入行 `sep` 之前插入两个组件
- 打开 wrap/rotate 时关闭 align/border；打开 align/border 时关闭 text menu

- [ ] **Step 1: 写失败的结构测试**

在 `toolbar-style.test.mjs` 的 `GLYPHS` 增加：`zidonghuanhang`、`jieduan`、`wuxuanzhuang`、`xiangshangqingxie`、`xiangxiaqingxie`、`shupaiwenzi`、`wenbenxiangshang`、`xiangxia90`（`yichu1` 已在）。

在 `Toolbar.vue markup` 测试中增加：

```js
assert.match(sfc, /ToolbarTextWrapSplit/);
assert.match(sfc, /ToolbarTextRotateSplit/);
```

新增 describe：

```js
describe("ToolbarTextWrapSplit.vue", () => {
  it("has three wrap modes and applies tb", () => {
    const sfc = fs.readFileSync(wrapPath, "utf8");
    assert.match(sfc, /溢出/);
    assert.match(sfc, /自动换行/);
    assert.match(sfc, /截断/);
    assert.match(sfc, /applyStyleToSelection\(\{\s*tb:/);
  });
});

describe("ToolbarTextRotateSplit.vue", () => {
  it("has six rotate modes and applies tr", () => {
    const sfc = fs.readFileSync(rotatePath, "utf8");
    assert.match(sfc, /无旋转/);
    assert.match(sfc, /竖排文字/);
    assert.match(sfc, /向上90/);
    assert.match(sfc, /applyStyleToSelection\(\{\s*tr:/);
  });
});
```

- [ ] **Step 2: 跑 vue 测试确认失败**

Run: `pnpm --filter @luckysheet3/vue exec node --test tests/toolbar-style.test.mjs`  
Expected: FAIL（缺组件 / 缺 glyph 断言视 iconfont 而定；若 glyph 已在 iconfont 则仅缺 SFC）

- [ ] **Step 3: 实现两个 SFC 并接入 Toolbar**

完整复制 AlignSplit 模式，改 ITEMS / DEFAULT / `applyStyleToSelection({ tb })` / `{ tr }` / title「文本换行」「文本旋转」。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @luckysheet3/vue exec node --test tests/toolbar-style.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**（仅当用户要求）

```bash
git add packages/vue/src/components/ToolbarTextWrapSplit.vue packages/vue/src/components/ToolbarTextRotateSplit.vue packages/vue/src/components/Toolbar.vue packages/vue/tests/toolbar-style.test.mjs
git commit -m "feat(vue): 工具栏文本换行与旋转拆分按钮"
```

---

### Task 7: FEATURE_MAP 与收尾验收

**Files:**
- Modify: `docs/FEATURE_MAP.md`

- [ ] **Step 1: 更新映射表**

§5 工具栏细项：

| 自动换行/旋转 | usable | 拆分按钮 + `tb`/`tr` + text-layout 渲染与行高 |

§2 `getRowlen.js` 行可改为 `skeleton`/`usable` 备注：选区/编辑路径行高，非全表扫描。

- [ ] **Step 2: 全量回归**

```bash
pnpm --filter @luckysheet3/core test
pnpm --filter @luckysheet3/vue exec node --test tests/toolbar-style.test.mjs
pnpm --filter @luckysheet3/core typecheck
```

Expected: 全部 PASS

- [ ] **Step 3: 手工验收清单（playground）**

1. 截断 / 溢出 / 自动换行三种可见差异  
2. 溢出进入右侧空格，遇字停止  
3. 六种旋转可辨  
4. 自动换行后行高变大  
5. Ctrl+Z 一次恢复样式与行高  

- [ ] **Step 4: Commit**（仅当用户要求）

```bash
git add docs/FEATURE_MAP.md
git commit -m "docs: FEATURE_MAP 标记换行/旋转为 usable"
```

---

## Spec Coverage（自检）

| Spec 要求 | Task |
|-----------|------|
| `tb`/`tr` 数据模型 | T1 |
| 菜单字符串映射 | T1 / T6 |
| `FORMAT_KEYS` / 清除格式 | T1（clearFormat 已剥除样式字段） |
| `layoutCellText` 换行/旋转/竖排 | T2 |
| 跨格溢出仅 tb=1∧tr=0 | T2 overflow 标志 + T3/T5 |
| `scanOverflowSpan` / `measureRowHeight` | T3 |
| 样式与编辑触发行高 | T4 |
| 一步撤销 | T4 `setStyleRange` structural + setCellValue prevHeight |
| Canvas 绘制 | T5 |
| 工具栏拆分按钮与互斥 | T6 |
| FEATURE_MAP | T7 |
| 非目标（全表扫描/inlineString/截图/extras 提升） | 无任务（刻意不做） |

## Placeholder / 一致性自检

- 无 TBD；溢出锚点列明确为 **startCol 绘制**（与原版末列画视觉等价，实现更简）
- `setStyle` / `setStyleRange` / `applyStyleToSelection` Pick 列表均含 `tb`/`tr`
- 测量函数名统一 `MeasureTextFn` / `setMeasureText` / bus.`measureText`
