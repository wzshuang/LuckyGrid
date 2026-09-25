# 工具栏边框按钮对齐原版

- 日期：2026-09-28
- 状态：已批准（§1–§3），待实现
- 范围：工具栏边框 **拆分按钮 + 完整边框菜单**；`@luckysheet3/core` 边框类型与线型渲染
- 对照：Luckysheet 2.x 工具栏 `border` 项（`luckysheet-icon-border-all` / `luckysheet-icon-border-menu`）及 `LuckysheetDemo/luckysheet.umd.js` 中 `border-*` 应用逻辑

## 1. 目标

将当前三颗独立边框按钮（所有 / 外侧 / 无边框）改为与原版一致的 **一颗拆分按钮**，并补齐菜单内全部边框类型、边框颜色与边框线型子菜单。

**成功标准**（playground 对照 `http://localhost:5173/luckysheet-original/`）：

- 控件位于填充色之后、合并之前：**左图标 + 右下拉箭头**（复用 `.ls3-toolbar__split` / `.ls3-toolbar__menu`，交互模式同 `ToolbarAlignSplit`）。
- 主菜单项顺序与分隔线与原版一致：
  1. 上 / 下 / 左 / 右
  2. 分隔
  3. 无边框 / 全部 / 外侧
  4. 分隔
  5. 内侧 / 内部横线 / 内部竖线
  6. 分隔
  7. **边框颜色**（文字 + 底部色条，**系统取色器** `<input type="color">`）
  8. **边框线型**（右侧子菜单，选项与 Lucky `style` 数值一致）
- **左侧点击**：对当前选区应用 **上次选中的边框类型**，使用当前 **颜色 + 线型**（默认：`border-all`、`#000000`、`style = 1`）。
- 撤销 / 重做：每次边框操作仍为一步 `setBorders`（`applyStructural`）。
- 线型在 Canvas 上按 `bd.*.style` 可辨认（实线 / 虚线 / 点线 / 粗细等）；个别 style（如 9、10）允许与原版存在像素级差异，但 **数据与菜单选项须与 Lucky 一致**。

## 2. 非目标

- 原版 Spectrum 色板、主题色条（颜色仅用系统取色器）。
- 仅依赖 `config.borderInfo` 自动还原复杂历史边框（仍以单元格 `bd` + 工具栏写入的 `borderInfo` 为主）。
- 合并单元格「合并类型」下拉（`luckysheet-icon-merge-menu`）。
- 从当前选区单元格反推并同步工具栏边框状态（工具栏仅会话内记忆 `lastBorderType` / `borderColor` / `borderStyle`）。
- 像素级截图回归测试。

## 3. 已确认决策

| 项 | 选择 |
|---|---|
| 范围 | A：完整对齐原版菜单能力 |
| 边框颜色 | 系统取色器（同文字色 / 填充色模式） |
| 选色行为 | 只更新 `borderColor` 与菜单色条，不自动重画选区；需再选类型或点左侧一键应用 |
| Core | 扩展 `BorderType` 与 `applyBorderType`，合并单元格逻辑对齐原版分支 |
| UI | 新组件 `ToolbarBorderSplit.vue`，替换三颗 `ToolbarButton` |

## 4. 架构

### 4.1 Core（`@luckysheet3/core`）

**类型**

- `BorderType`（Lucky `borderType` 字符串）：
  - `border-top` | `border-bottom` | `border-left` | `border-right`
  - `border-none` | `border-all` | `border-outside`
  - `border-inside` | `border-horizontal` | `border-vertical`
- 导出 `BORDER_LINE_STYLES`：`{ value: number; label?: string }[]`，与原版线型子菜单的 `style` 数值一致。
- `BorderInfoEntry.borderType` 使用 `BorderType`。

**边框应用**

- `applyBorderType(sheet, range, borderType, color?, style?)`（可由现有 `applyBorders` 重构或替换）：
  - 读写单元格 `bd.t` / `bd.b` / `bd.l` / `bd.r`。
  - 逻辑移植自 `LuckysheetDemo/luckysheet.umd.js` 中各 `border-*` 分支（含相邻格共享边、合并块边界）。
  - 使用 `Sheet.getMergeAt` / `Sheet.isMergeCovered`；`border-all` 等对合并块只画块外轮廓。
  - `border-none`：选区内清除每格 `bd`。
  - 其它类型：仅 patch 对应边（`mergeBd`），不清除无关边。
- 成功后 **append** `config.borderInfo` 一条（`rangeType: "range"`、`borderType`、`color`、`style`、`range`）。

**命令与引擎**

- `setBorders`：`borderType: BorderType`，`color?`，`style?`（实现时可保留旧字段 `mode: "all"|"outside"|"none"` 的短期别名映射到对应 `borderType`，公开 API 以 `borderType` 为准）。
- `WorkbookEngine.applyBordersToSelection(borderType, color?, style?)`：无选区则 return。

**渲染**

- `paintCellBorders` 抽取 `strokeBorderSide(ctx, side, x1,y1,x2,y2)`：
  - `side.color` 默认 `#000000`。
  - `side.style` 映射 `lineWidth` 与 `setLineDash`（覆盖原版常用线型）。

### 4.2 Vue（`@luckysheet3/vue`）

**`ToolbarBorderSplit.vue`**

- Props：`engine`、`open`（与对齐菜单相同的 `v-model:open` 互斥模式）。
- 状态（组件内 `ref`，不写入 `ChromeState`）：
  - `lastBorderType`（默认 `border-all`）
  - `borderColor`（默认 `#000000`）
  - `borderStyle`（默认 `1`）
- 左侧：图标随 `lastBorderType` 映射 iconfont（默认 `quanjiabiankuang`）；点击 `applyBordersToSelection(lastBorderType, borderColor, borderStyle)`。
- 右侧主菜单：
  - 类型项：点击后 `apply` + 更新 `lastBorderType` + 关闭菜单。
  - 分隔：`.ls3-toolbar__menu-sep`。
  - 边框颜色：点击打开隐藏 `input[type=color]`；`@input` 仅更新 `borderColor`。
  - 边框线型：展开右侧子菜单 `.ls3-toolbar__menu--sub`；选中更新 `borderStyle`。
- 行为：`Escape`、外部 `pointerdown` 关闭主菜单与子菜单（同 `ToolbarAlignSplit`）。

**`Toolbar.vue`**

- 移除 `quanjiabiankuang` / `sizhoujiabiankuang` / `wubiankuang` 三按钮。
- 插入 `<ToolbarBorderSplit />`；`openBorderMenu` 与 `openAlignMenu` 互斥。

**`toolbar.css`**

- 菜单分隔线、子菜单定位、线型预览行、颜色行色条样式。

### 4.3 数据流

```
ToolbarBorderSplit
  → engine.applyBordersToSelection(borderType, color, style)
  → CommandBus setBorders
  → applyBorderType → cells.bd + config.borderInfo
  → Canvas 重绘（现有 styleRev / 渲染管线）
```

## 5. 测试

### 5.1 Core（`packages/core/tests/borders.spec.ts` 等）

- 保留现有 `all` / `outside` / `none` + undo 用例（改为 `borderType` 命名）。
- 新增：`border-top`（2×2 仅顶行 `t`）；`border-inside` / `border-horizontal` / `border-vertical` 最小断言。
- 合并区域 `border-all` 抽查锚点与内部格 `bd`。
- `color` + `style` 写入 `bd` 边对象。

### 5.2 Vue（`packages/vue/tests/toolbar-style.test.mjs`）

- `Toolbar.vue` 不再含三颗独立边框 `icon=`。
- 引用 `ToolbarBorderSplit`；含 `type="color"` 与线型 / 颜色菜单文案。

### 5.3 手工

- Playground 与 iframe 原版：菜单顺序、左键重复上次类型、颜色条、线型子菜单、合并区画边。

## 6. 边界行为

| 情况 | 行为 |
|------|------|
| 无选区 | 不执行命令 |
| 1×1 选区 | 单边 / 外侧 / 全部均合法 |
| 取色器取消 | `borderColor` 不变 |
| 点击文档外 | 关闭主菜单与子菜单 |
| 撤销 | 整次边框操作一步 undo |

## 7. 与既有 spec 的关系

- `2026-09-21-toolbar-button-style-design.md` 曾将「边框菜单」列为非目标；本 spec 取代其中「边框仍为多颗独立图标」的约束。其它工具栏样式决策不变。
