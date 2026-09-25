# 工具栏边框按钮对齐原版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一颗拆分边框按钮替换三颗独立按钮，补齐 Lucky 全部 `borderType`、系统取色器选色与线型子菜单，并扩展 core 边框应用与 Canvas 线型绘制。

**Architecture:** 在 `@luckysheet3/core` 新增 `BorderType`、`BORDER_LINE_STYLES`、`borderLineStroke()` 与 `applyBorderType()`（逻辑对照 `D:/dev/git/github.com/LuckysheetDemo/luckysheet.umd.js` 中 `g=="border-*"` 分支）。命令 `setBorders` 改为携带 `borderType`。Vue 层新增 `ToolbarBorderSplit.vue`，样式扩展 `toolbar.css`，`Toolbar.vue` 接入并与对齐菜单互斥。

**Tech Stack:** TypeScript、`@luckysheet3/core`（Vitest）、Vue 3 SFC、`node:test`（vue 包结构测试）、pnpm workspace。

**Spec:** `docs/superpowers/specs/2026-09-28-toolbar-border-design.md`

## Global Constraints

- 边框颜色仅用系统 `<input type="color">`，不用 Spectrum / 自定义色板
- 选色只更新工具栏 `borderColor`，不自动重画选区
- 工具栏状态 `lastBorderType` / `borderColor` / `borderStyle` 仅在组件内 `ref`，不从选区反读
- `borderType` 字符串与 Lucky `config.borderInfo[].borderType` 一致
- 无选区时 `applyBordersToSelection` 静默 return
- 提交信息用中文 `feat:` / `test:` / `docs:`；每任务末尾 commit **仅当用户明确要求提交时执行**
- 对照原版 UI：`http://localhost:5173/luckysheet-original/`（需 sibling `LuckysheetDemo`）

## File Map

| 文件 | 职责 |
|---|---|
| `packages/core/src/border/types.ts` | `BorderType`、`BorderInfoEntry`、`BORDER_LINE_STYLES` |
| `packages/core/src/border/border-line-stroke.ts` | `borderLineStroke(style)` → `{ lineWidth, dash }` |
| `packages/core/src/border/apply-border-type.ts` | `applyBorderType(sheet, range, borderType, color, style)` |
| `packages/core/src/border/borders.ts` | 薄 re-export 或删除后改 import 指向 `apply-border-type` |
| `packages/core/src/command/types.ts` | `setBorders.borderType` |
| `packages/core/src/command/bus.ts` | 调用 `applyBorderType` |
| `packages/core/src/engine.ts` | `applyBordersToSelection(borderType, ...)` |
| `packages/core/src/render/canvas-renderer.ts` | `strokeBorderSide` + 线型 dash |
| `packages/core/src/index.ts` | 导出类型与常量 |
| `packages/core/tests/border-line-stroke.spec.ts` | 线型映射单测 |
| `packages/core/tests/borders.spec.ts` | 边框类型与 undo |
| `packages/vue/src/components/ToolbarBorderSplit.vue` | 拆分按钮 + 菜单 + 子菜单 |
| `packages/vue/src/components/Toolbar.vue` | 替换三按钮、互斥 open 状态 |
| `packages/vue/src/styles/toolbar.css` | 分隔线、子菜单、线型预览、颜色行 |
| `packages/vue/tests/toolbar-style.test.mjs` | 结构断言更新 |
| `docs/FEATURE_MAP.md` | 工具栏 / border 行状态 |

---

### Task 1: 边框类型常量与线型映射

**Files:**
- Create: `packages/core/src/border/types.ts`
- Create: `packages/core/src/border/border-line-stroke.ts`
- Create: `packages/core/tests/border-line-stroke.spec.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `export type BorderType = "border-top" | "border-bottom" | ...`（spec §4.1 全部 11 个）
- Produces: `export const BORDER_LINE_STYLES: ReadonlyArray<{ value: number; key: string }>`（style **1–13**，顺序与 `LuckysheetDemo/luckysheet.umd.js` 内线型子菜单一致；实现前在该文件搜索 `border-Thin`，按相邻 `value:"N"` 录入）
- Produces: `export function borderLineStroke(style: number): { lineWidth: number; dash: number[] }`

- [ ] **Step 1: 写失败测试**

`packages/core/tests/border-line-stroke.spec.ts`：

```ts
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

  it("style 3 is dotted", () => {
    const s = borderLineStroke(3);
    expect(s.dash.length).toBeGreaterThan(0);
  });

  it("style 13 is thicker than 1", () => {
    expect(borderLineStroke(13).lineWidth).toBeGreaterThan(borderLineStroke(1).lineWidth);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd packages/core && pnpm test border-line-stroke
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 types 与 stroke 映射**

`packages/core/src/border/types.ts`（`BORDER_LINE_STYLES` 示例骨架，**13 项 key 必须按 umd 顺序核对**）：

```ts
export type BorderType =
  | "border-top"
  | "border-bottom"
  | "border-left"
  | "border-right"
  | "border-none"
  | "border-all"
  | "border-outside"
  | "border-inside"
  | "border-horizontal"
  | "border-vertical";

export type BorderInfoEntry = {
  rangeType: "range";
  borderType: BorderType;
  color: string;
  style: number;
  range: Array<{ row: [number, number]; column: [number, number] }>;
};

export const BORDER_LINE_STYLES: ReadonlyArray<{ value: number; key: string }> = [
  { value: 1, key: "Thin" },
  { value: 2, key: "Hair" },
  { value: 3, key: "Dotted" },
  { value: 4, key: "DashDot" },
  { value: 5, key: "DashDotDot" },
  { value: 6, key: "SlantDashDot" },
  { value: 7, key: "Double" },
  { value: 8, key: "Medium" },
  { value: 9, key: "MediumDashed" },
  { value: 10, key: "MediumDashDot" },
  { value: 11, key: "MediumDashDotDot" },
  { value: 12, key: "SlantDashDot" },
  { value: 13, key: "Thick" },
];
```

`packages/core/src/border/border-line-stroke.ts`（dash 可对照 luckysheet `drawLineInfo` / canvas 边框绘制；允许与原版略有像素差，但 3/4/5/9 等须明显可辨）：

```ts
export function borderLineStroke(style: number): { lineWidth: number; dash: number[] } {
  switch (style) {
    case 2:
      return { lineWidth: 1, dash: [] }; // Hair：1px
    case 3:
      return { lineWidth: 1, dash: [1, 1] };
    case 4:
      return { lineWidth: 1, dash: [4, 2, 1, 2] };
    case 5:
      return { lineWidth: 1, dash: [4, 2, 1, 2, 1, 2] };
    case 7:
      return { lineWidth: 1, dash: [] }; // Double：绘制时可选画两次，MVP 可先 2px 实线
    case 8:
      return { lineWidth: 2, dash: [] };
    case 9:
      return { lineWidth: 2, dash: [4, 2] };
    case 10:
      return { lineWidth: 2, dash: [4, 2, 1, 2] };
    case 11:
      return { lineWidth: 2, dash: [4, 2, 1, 2, 1, 2] };
    case 13:
      return { lineWidth: 3, dash: [] };
    default:
      return { lineWidth: style >= 2 ? 2 : 1, dash: [] };
  }
}
```

`packages/core/src/index.ts` 增加：

```ts
export type { BorderType, BorderInfoEntry } from "./border/types.js";
export { BORDER_LINE_STYLES } from "./border/types.js";
export { borderLineStroke } from "./border/border-line-stroke.js";
```

- [ ] **Step 4: 测试通过**

```bash
cd packages/core && pnpm test border-line-stroke
```

Expected: PASS

- [ ] **Step 5: Commit（用户要求时）**

```bash
git add packages/core/src/border/types.ts packages/core/src/border/border-line-stroke.ts packages/core/tests/border-line-stroke.spec.ts packages/core/src/index.ts
git commit -m "feat(core): 边框线型常量与 Canvas stroke 映射"
```

---

### Task 2: `applyBorderType` 基础类型（none / all / outside / 四边）

**Files:**
- Create: `packages/core/src/border/apply-border-type.ts`
- Modify: `packages/core/src/border/borders.ts`（改为 re-export `applyBorderType`，或删除并由 index/bus 改 import）
- Modify: `packages/core/tests/borders.spec.ts`
- Modify: `packages/core/src/command/types.ts`
- Modify: `packages/core/src/command/bus.ts`
- Modify: `packages/core/src/engine.ts`

**Interfaces:**
- Consumes: `BorderType`, `BorderInfoEntry` from `types.ts`
- Produces: `export function applyBorderType(sheet: Sheet, range: SelectionRange, borderType: BorderType, color?: string, style?: number): void`
- Produces: `WorkbookEngine.applyBordersToSelection(borderType: BorderType, color?: string, style?: number): void`
- Produces: `setBorders` 命令形状 `{ type: "setBorders"; range; borderType; color?; style? }`

- [ ] **Step 1: 更新失败测试（borderType 命名）**

`packages/core/tests/borders.spec.ts` 将 `applyBordersToSelection("all", ...)` 改为 `"border-all"`，`"outside"` → `"border-outside"`；新增：

```ts
it("border-top paints top row only in 2x2", () => {
  const eng = new WorkbookEngine();
  eng.execute({ type: "setSelection", selection: [{ row: [0, 1], column: [0, 1] }] });
  eng.applyBordersToSelection("border-top", "#00ff00", 2);
  expect(eng.workbook.getCell(0, 0)?.bd?.t?.color).toBe("#00ff00");
  expect(eng.workbook.getCell(0, 0)?.bd?.t?.style).toBe(2);
  expect(eng.workbook.getCell(1, 0)?.bd?.t).toBeUndefined();
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd packages/core && pnpm test borders
```

- [ ] **Step 3: 实现 `applyBorderType` 基础分支**

在 `apply-border-type.ts` 中：

1. 从现有 `borders.ts` 迁入 `normalizeRange`、`ensureCell`、`setBd`、`mergeBd`、`side()`。
2. 实现 `border-none` / `border-all` / `border-outside`（与现逻辑相同，仅 `borderType` 字符串不同）。
3. 实现 `border-top` / `border-bottom` / `border-left` / `border-right`：
   - 顶边：选区 `r0` 行每格设 `t`；若上一行格存在且非合并覆盖问题，同步上一行同列 `b`（对照 umd `g=="border-top"` 片段）。
   - 底/左/右同理。
4. 末尾 append `borderInfo`（`borderType` 字段用新类型名）。

`command/types.ts`：

```ts
| {
    type: "setBorders";
    range: SelectionRange;
    borderType: BorderType;
    color?: string;
    style?: number;
    sheetIndex?: string | number;
  }
```

`bus.ts` `case "setBorders"` 调用 `applyBorderType(..., command.borderType, ...)`.

`engine.ts`：

```ts
applyBordersToSelection(borderType: BorderType, color = "#000000", style = 1): void {
  const sel = this.getActiveRange();
  if (!sel) return;
  this.execute({ type: "setBorders", range: sel, borderType, color, style });
}
```

- [ ] **Step 4: 测试通过**

```bash
cd packages/core && pnpm test borders
```

- [ ] **Step 5: Commit（用户要求时）**

```bash
git commit -m "feat(core): applyBorderType 与 setBorders borderType API"
```

---

### Task 3: 内侧边框与合并单元格感知

**Files:**
- Modify: `packages/core/src/border/apply-border-type.ts`
- Modify: `packages/core/tests/borders.spec.ts`

**Interfaces:**
- Consumes: `Sheet.getMergeAt`, `Sheet.isMergeCovered`, `sheet.config.merge`
- Produces: `border-inside` / `border-horizontal` / `border-vertical` 行为与 umd 一致；`border-all` 在合并块上只画块外轮廓

- [ ] **Step 1: 写失败测试**

```ts
it("border-inside adds internal edges in 2x2", () => {
  const eng = new WorkbookEngine();
  eng.execute({ type: "setSelection", selection: [{ row: [0, 1], column: [0, 1] }] });
  eng.applyBordersToSelection("border-inside");
  expect(eng.workbook.getCell(0, 0)?.bd?.r).toBeTruthy();
  expect(eng.workbook.getCell(0, 1)?.bd?.l).toBeTruthy();
});

it("border-all on merged block outlines anchor edges", () => {
  const eng = new WorkbookEngine();
  eng.mergeSelection(); // 或 execute merge 到 0,0 2x2
  eng.execute({ type: "setSelection", selection: [{ row: [0, 1], column: [0, 1] }] });
  eng.applyBordersToSelection("border-all");
  const anchor = eng.workbook.getCell(0, 0);
  expect(anchor?.bd?.t && anchor?.bd?.l).toBeTruthy();
});
```

（按项目现有 merge API 调整 setup。）

- [ ] **Step 2: 运行确认失败**

```bash
cd packages/core && pnpm test borders
```

- [ ] **Step 3: 移植 umd 逻辑**

在 `apply-border-type.ts` 增加分支（对照 `luckysheet.umd.js`）：

- `border-inside`：内部分隔线（非最外圈边）。
- `border-horizontal`：内部横线（`r0..r1-1` 行底边等，见 umd）。
- `border-vertical`：内部竖线。
- `border-all` / `border-outside`：遇到 `cell.mc` 或 `getMergeAt` 时只更新块边界格子的对应边，跳过 `isMergeCovered` 的非锚点（与 umd `border-all` 分支一致）。

- [ ] **Step 4: 测试通过**

```bash
cd packages/core && pnpm test
```

- [ ] **Step 5: Commit（用户要求时）**

```bash
git commit -m "feat(core): 内侧边框与合并块边框轮廓"
```

---

### Task 4: Canvas 线型绘制

**Files:**
- Modify: `packages/core/src/render/canvas-renderer.ts`

**Interfaces:**
- Consumes: `borderLineStroke(style)` from `border-line-stroke.ts`

- [ ] **Step 1: 抽取 `strokeBorderSide`**

在 `canvas-renderer.ts` 的 `paintCellBorders` 内：

```ts
import { borderLineStroke } from "../border/border-line-stroke.js";

function strokeBorderSide(
  ctx: CanvasRenderingContext2D,
  side: BorderSide,
  x1: number, y1: number, x2: number, y2: number,
): void {
  const { lineWidth, dash } = borderLineStroke(side.style ?? 1);
  ctx.strokeStyle = side.color || "#000000";
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}
```

`paintCellBorders` 四条边改为调用 `strokeBorderSide`。

- [ ] **Step 2: 手动或现有渲染测试**

```bash
cd packages/core && pnpm test && pnpm typecheck
```

Playground：选区设 `border-all` + style 3/9，肉眼区分点线/虚线。

- [ ] **Step 3: Commit（用户要求时）**

```bash
git commit -m "feat(core): Canvas 按 Lucky style 绘制边框线型"
```

---

### Task 5: `ToolbarBorderSplit` 组件

**Files:**
- Create: `packages/vue/src/components/ToolbarBorderSplit.vue`
- Modify: `packages/vue/src/styles/toolbar.css`
- Create: `packages/vue/tests/toolbar-border-split.test.mjs`（可选，或扩展现有 test 文件）

**Interfaces:**
- Consumes: `BorderType`, `BORDER_LINE_STYLES` from `@luckysheet3/core`
- Consumes: `WorkbookEngine.applyBordersToSelection(borderType, color, style)`
- Produces: 组件 `props: { engine, open }`, `emit: update:open`

- [ ] **Step 1: 写失败结构测试**

在 `packages/vue/tests/toolbar-style.test.mjs` 末尾增加：

```js
const borderSplitPath = path.join(root, "src/components/ToolbarBorderSplit.vue");

describe("ToolbarBorderSplit.vue", () => {
  it("defines border menu items and color input", () => {
    const sfc = fs.readFileSync(borderSplitPath, "utf8");
    assert.match(sfc, /border-top/);
    assert.match(sfc, /border-inside/);
    assert.match(sfc, /边框颜色/);
    assert.match(sfc, /边框线型/);
    assert.match(sfc, /type="color"/);
    assert.match(sfc, /BORDER_LINE_STYLES/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd packages/vue && pnpm test
```

- [ ] **Step 3: 实现组件**

`ToolbarBorderSplit.vue` 要点：

```ts
import { BORDER_LINE_STYLES, type BorderType, type WorkbookEngine } from "@luckysheet3/core";

const BORDER_ICONS: Record<BorderType, string> = {
  "border-top": "shangbiankuang",
  "border-bottom": "xiabiankuang",
  "border-left": "zuobiankuang",
  "border-right": "youbiankuang",
  "border-none": "wubiankuang",
  "border-all": "quanjiabiankuang",
  "border-outside": "sizhoujiabiankuang",
  "border-inside": "neikuangxian",
  "border-horizontal": "neikuanghengxian",
  "border-vertical": "neikuangshuxian",
};

const MENU: Array<{ kind: "item"; type: BorderType; title: string } | { kind: "sep" }> = [
  { kind: "item", type: "border-top", title: "上边框" },
  { kind: "item", type: "border-bottom", title: "下边框" },
  { kind: "item", type: "border-left", title: "左边框" },
  { kind: "item", type: "border-right", title: "右边框" },
  { kind: "sep" },
  { kind: "item", type: "border-none", title: "无边框" },
  { kind: "item", type: "border-all", title: "所有边框" },
  { kind: "item", type: "border-outside", title: "外边框" },
  { kind: "sep" },
  { kind: "item", type: "border-inside", title: "内侧边框" },
  { kind: "item", type: "border-horizontal", title: "内部横线" },
  { kind: "item", type: "border-vertical", title: "内部竖线" },
  { kind: "sep" },
];
// 再接 color row + style submenu（非 MENU 数组项，模板内联）
```

- 左键：`apply(lastBorderType, borderColor, borderStyle)`
- 类型项：`apply` + `lastBorderType = type` + `emit('update:open', false)`
- 颜色行：`@click` → `colorInput.click()`；`@input` → `borderColor = v`
- 线型：子菜单 `openStyleSub`，项来自 `BORDER_LINE_STYLES`，选中更新 `borderStyle`
- 复制 `ToolbarAlignSplit` 的 `pointerdown` / `Escape` 处理；子菜单打开时点击外部一并关闭

`toolbar.css` 增加：

```css
.ls3-toolbar__menu-sep { height: 1px; margin: 4px 8px; background: #e0e0e0; }
.ls3-toolbar__menu-item--color .ls3-toolbar__color-line { border-bottom: 3px solid #000; }
.ls3-toolbar__menu--sub { position: absolute; left: 100%; top: 0; ... }
.ls3-toolbar__line-preview { width: 72px; height: 0; border-top: 2px solid #333; }
```

- [ ] **Step 4: 测试通过**

```bash
cd packages/vue && pnpm test
```

- [ ] **Step 5: Commit（用户要求时）**

```bash
git commit -m "feat(vue): ToolbarBorderSplit 边框菜单与线型子菜单"
```

---

### Task 6: 接入 `Toolbar.vue` 与 FEATURE_MAP

**Files:**
- Modify: `packages/vue/src/components/Toolbar.vue`
- Modify: `packages/vue/tests/toolbar-style.test.mjs`
- Modify: `docs/FEATURE_MAP.md`

- [ ] **Step 1: 更新 toolbar 结构测试**

`toolbar-style.test.mjs` 的 `icons` 数组 **删除** `quanjiabiankuang`, `sizhoujiabiankuang`, `wubiankuang`；`Toolbar.vue` 断言改为：

```js
assert.match(sfc, /ToolbarBorderSplit/);
assert.doesNotMatch(sfc, /icon="quanjiabiankuang"/);
```

- [ ] **Step 2: 修改 Toolbar.vue**

```vue
import ToolbarBorderSplit from "./ToolbarBorderSplit.vue";
const openBorderMenu = ref(false);

// watch openAlignMenu / openBorderMenu 互斥（打开一个时关另一个）

<ToolbarBorderSplit
  :engine="engine"
  :open="openBorderMenu"
  @update:open="(v) => (openBorderMenu = v)"
/>
```

删除三颗 `ToolbarButton` 边框按钮。

- [ ] **Step 3: 全量测试**

```bash
pnpm test
pnpm typecheck
```

- [ ] **Step 4: 更新 FEATURE_MAP**

`docs/FEATURE_MAP.md`：

- §5 表格「边框」行：`usable` → 拆分按钮 + 全类型 + 系统色 + 线型子菜单
- `border.js` 行：内侧/线型全集 → 已实现（borderInfo 移位仍注明缺口若未改）

- [ ] **Step 5: 手工验收**

`pnpm dev` → 对照原版 iframe：菜单顺序、左键重复上次、取色、线型、合并区。

- [ ] **Step 6: Commit（用户要求时）**

```bash
git commit -m "feat(vue): 工具栏接入边框拆分按钮并更新 FEATURE_MAP"
```

---

## Spec Coverage Checklist

| Spec 要求 | Task |
|---|---|
| 11 种 `borderType` | Task 2–3 |
| `borderInfo` append | Task 2–3 |
| 线型 1–13 菜单与数据 | Task 1, 5 |
| Canvas 线型可辨认 | Task 4 |
| 拆分按钮 + 菜单顺序 | Task 5–6 |
| 系统取色器 | Task 5 |
| 左键上次类型 | Task 5 |
| undo 一步 | Task 2（沿用 applyStructural） |
| 无选区静默 | Task 2 |
| FEATURE_MAP | Task 6 |

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-28-toolbar-border.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每任务独立子代理，任务间你做 review，迭代快

**2. Inline Execution** — 本会话按 `executing-plans` 逐任务执行，批次检查点

你想用哪种方式？若直接说「开始实现」，默认采用 **Inline Execution** 从 Task 1 做起。
