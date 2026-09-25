# 工具栏文本换行与文本旋转

- 日期：2026-09-28
- 状态：已批准（§1–§5），待实现
- 范围：工具栏 **文本换行 / 文本旋转** 拆分按钮；单元格 `tb` / `tr`；Core 统一文本布局与行高重算；Canvas 渲染（含跨格溢出）
- 对照：Luckysheet 2.1.13 `toolbar.js`（`textWrapMode` / `textRotateMode`）、`menuButton.js`（`tb` / `tr`）、`getRowlen.js`（`getCellTextInfo` / `rowlenByRange`）、`draw.js`（溢出绘制）

## 1. 目标

补齐原版工具栏「文本换行」「文本旋转」：拆分按钮 + 菜单完整，写入 Lucky 兼容字段 `tb` / `tr`，Canvas 能表现三种换行（含跨格溢出）与六种旋转，并在格式变更与编辑提交时重算相关行高。

**成功标准**（playground 对照原版工具栏）：

- 控件位于水平/垂直对齐之后、插入行之前：各一颗 **左图标 + 右箭头** 拆分按钮（复用 `.ls3-toolbar__split` / `.ls3-toolbar__menu`，交互同 `ToolbarAlignSplit`）。
- 换行菜单：溢出 / 自动换行 / 截断（数据 `tb`：`1` / `2` / `0`）。
- 旋转菜单：无旋转 / 向上倾斜 / 向下倾斜 / 竖排文字 / 向上 90° / 向下 90°（数据 `tr`：`0`–`5`）。
- **左侧点击**：对选区应用当前活动单元格模式（缺省：截断 `tb=0`、无旋转 `tr=0`）。
- 撤销 / 重做：一次工具栏应用或一次编辑提交（含因此产生的行高变更）为一步。
- 溢出：文字可画入右侧连续空单元格，遇非空、合并挡板或表界停止。

## 2. 非目标

- 整文件移植原版 `getRowlen.js` / 全表启动时 `rhchInit` 式行高扫描。
- 任意自定义角度的工具栏 UI（导入 JSON 若带非 0–5 的 `tr` / 角度：尽力渲染；菜单仍只暴露六档）。
- 富文本 `inlineString` 内局部换行 / 旋转。
- 像素级截图回归。
- 合并类型菜单、字体家族等其它工具栏缺口。

## 3. 已确认决策

| 项 | 选择 |
|---|---|
| 深度 | A：完整可用（UI + 数据 + 渲染 + 行高） |
| 溢出 | A：跨邻格绘制（对齐原版） |
| 行高触发 | A：改 `tb`/`tr`/`fs` 与编辑提交均重算相关行 |
| 架构 | 方案 1：Core 统一 `text-layout`，渲染与行高共用 |
| 工具栏状态 | 跟活动单元格同步（对齐 `ToolbarAlignSplit`，非边框会话记忆） |

## 4. 数据模型与命令

### 4.1 单元格字段

在 `CellStyle` / `CellData` 增加：

| 字段 | 含义 | 取值 |
|------|------|------|
| `tb` | 换行模式 | `0` 截断 · `1` 溢出 · `2` 自动换行（缺省按截断行为） |
| `tr` | 旋转模式 | `0` 无 · `1` 上倾 · `2` 下倾 · `3` 竖排 · `4` 上 90° · `5` 下 90° |

存储用 **数字**（与原版 `updateFormatCell` 写入一致）。菜单用字符串 id（`overflow` / `wrap` / `clip`，`none` / `angleup` / `angledown` / `vertical` / `rotation-up` / `rotation-down`），在 Vue 或薄映射层转为数字再下发。

导入 JSON：若历史数据把 `tb` / `tr` 放在 `extras`，加载时提升到一等字段；未知数字角度（非 0–5）保留原值，渲染尽力，菜单无精确勾选时回退显示为「无旋转」类状态。

### 4.2 命令 / Engine

- 扩展 `setStyle` 的 `style`：`Pick` 纳入 `tb` | `tr`。
- `WorkbookEngine.applyStyleToSelection` 同步放宽类型。
- 格式刷 / 清除格式 / 剪贴板样式：`FORMAT_KEYS`（`clipboard/style.ts`）纳入 `tb`、`tr`。
- **不**新建独立 command 类型；行高仍走现有 `setRowHeight`（或同一次用户操作内批量执行）。
- `getActiveCellStyle()` 自然带上 `tb` / `tr`，供工具栏图标同步。
- `clearFormat` 清除 `tb` / `tr`（回到缺省截断 / 无旋转）。

### 4.3 撤销语义

一次工具栏点击或一次编辑提交，对用户是「一步」：样式写入与因此产生的行高更新落在同一可撤销单元（实现可用 structural 快照或 engine 打包多条 command；实现计划阶段定具体机制）。

## 5. 文本布局、溢出与行高

### 5.1 Core 模块 `text-layout`（新建）

单一职责：给定单元格 + 几何 +（可选）测量上下文，算出「怎么画」和「行要多高」。

主要 API（命名实现时可微调）：

- `layoutCellText(input) → { lines | glyphs, contentWidth, contentHeight, angle }`
  - `tb=2`：按列宽（减 padding）断行；尊重显式 `\n`。
  - `tb=0`：单行（或显式换行），宽度按内容，由渲染侧 clip。
  - `tb=1`：单行不强制断行；`contentWidth` 供溢出扫描。
  - `tr` 角度映射：`0→0°`，`1→45°`，`2→-45°`（对齐原版下倾语义），`3→竖排逐字`，`4→90°`，`5→-90°`；竖排按字纵向排列，不走普通水平 wrap。
- `measureRowHeight(sheet, row, measureText) → number`：该行非空格 `layout` 后取 `max(contentHeight + padding, 默认行高)`。
- `scanOverflowSpan(sheet, r, c) → { startCol, endCol }`：向右扫连续空格，直到非空 / 合并挡板 / 表界。

测量依赖注入 `measureText(text, font)`（浏览器用 Canvas），单测可用假测量。

### 5.2 溢出绘制策略

- **跨格溢出仅在 `tb=1` 且 `tr` 为 `0`（无旋转）时启用**。`tr` 为倾斜 / 竖排 / 90° 时即使 `tb=1`，也只在本格矩形内绘制（clip），避免与旋转坐标系纠缠；数据仍可写 `tb=1`。
- 启用跨格时：溢出内容在占用列区间的 **最后一列** 统一绘制，中间列跳过正文避免重复（对齐原版）。
- 占用矩形 = 起始列到 `endCol` 的合并宽度；绘制时 clip 到该矩形（及行高）。
- 邻格有内容或表界：溢出在该列前结束。

### 5.3 行高触发

| 时机 | 行为 |
|------|------|
| `applyStyleToSelection` 含 `tb` / `tr` / `fs` | 对选区覆盖的每一行 `measureRowHeight`，写 `config.rowlen` |
| `setCellValue` / 编辑提交 | 对变更行重算 |
| 仅改颜色等无关字段 | 不重算 |

默认行高下限保留（不因空内容把行压没）。不做全表启动扫描；不做 inlineString 逐 run 排版。旋转与 `tb=2` 的全部原版边角以可读、可测为准；竖排 + 自动换行取合理子集并用测试钉死。

## 6. 渲染集成与 Vue 工具栏

### 6.1 Canvas（`canvas-renderer`）

- 单元格正文绘制消费 `layoutCellText`：按 line/glyph 的 `x/y` + `rotate` 调用 `fillText`（及现有下划线 / 删除线，旋转时同一变换）。
- **截断 `tb=0`**：clip 到本格矩形。
- **换行 `tb=2`**：多行绘制，clip 本格；行高不足时底部裁切。
- **溢出 `tb=1`**：`scanOverflowSpan`；span 末列绘制、中间列跳过正文；clip 到 span 合并宽。
- **旋转**：`save` → `translate` → `rotate` → 画字 → `restore`；竖排走 glyph 列表。
- 合并单元格：布局用合并后宽高；溢出扫描尊重合并块边界。

### 6.2 Vue 工具栏

- 新组件（风格对齐 `ToolbarAlignSplit`）：
  - `ToolbarTextWrapSplit.vue`
  - `ToolbarTextRotateSplit.vue`
- 插入位置：**垂直对齐之后**、现有「插入行」分隔之前。
- 菜单与 iconfont：

| 换行 | `tb` | icon |
|------|------|------|
| 溢出 | 1 | `yichu1` |
| 自动换行 | 2 | `zidonghuanhang` |
| 截断 | 0 | `jieduan` |

| 旋转 | `tr` | icon |
|------|------|------|
| 无旋转 | 0 | `wuxuanzhuang` |
| 向上倾斜 | 1 | `xiangshangqingxie` |
| 向下倾斜 | 2 | `xiangxiaqingxie` |
| 竖排文字 | 3 | `shupaiwenzi` |
| 向上 90° | 4 | `wenbenxiangshang` |
| 向下 90° | 5 | `xiangxia90` |

- 左键：`applyStyleToSelection({ tb })` / `{ tr }`（当前活动格模式）。
- 菜单点选：写入对应值并更新主图标；勾选态跟活动格（`chrome.styleRev`）。
- 打开菜单时关闭边框 / 对齐等其它下拉（扩展现有互斥）。
- 文案用中文（与现工具栏一致），不引入完整 locale 包。

### 6.3 数据流

工具栏 / 编辑 → Engine（`setStyle` / `setCellValue` + 行高）→ workbook 变更 → paint → `layoutCellText` → canvas。

## 7. 测试与边界

### 7.1 Core 单测

| 主题 | 断言要点 |
|------|----------|
| `tb`/`tr` 映射 | 菜单字符串 ↔ 数字；缺省行为 |
| 自动换行断行 | 固定假 `measureText` 下长串按宽度拆行；`\n` 强制断行 |
| 截断 / 溢出宽度 | `tb=0` 不因列宽断行；`tb=1` 的 `contentWidth` 可大于 cellWidth |
| 溢出扫描 | 右侧空格可延伸；遇非空 / 合并 / 边界停止 |
| 旋转角度 | `tr` 0–5 → 约定角度；竖排产出多 glyph |
| 行高 | wrap 多行后 `measureRowHeight` ≥ 默认；改无关样式不抬高 |
| `setStyle` + 格式刷 / 清除 | `tb`/`tr` 写入、复制、清除 |
| 撤销 | 一次应用样式（含行高）可一步撤回到前态 |

### 7.2 Vue 测试

扩展 `toolbar-style.test.mjs`（或同类）：工具栏含换行 / 旋转拆分；菜单项数量与顺序；点击调用 `applyStyleToSelection` 且带正确 `tb`/`tr`（可 mock engine）。

### 7.3 边界约定

- 空选区：工具栏 no-op。
- 空单元格：可写入 `tb`/`tr`；无正文则不抬行高。
- 合并格：按合并主格样式与合并矩形布局。
- `tr` 非法 / 未知：按无旋转画，不抛错。
- 编辑态：提交后再重算行高；编辑浮层不必实时旋转。
- 性能：布局按可见格调用；溢出扫描上限为表 `colCount`；无全表预计算。

### 7.4 手工验收（playground）

对照原版：三种换行可见差异；溢出进空邻格；六种旋转可辨；自动换行后行变高；Ctrl+Z 恢复。

## 8. 实现落点（文件级预览）

| 区域 | 路径（预期） |
|------|----------------|
| 类型 | `packages/core/src/model/cell.ts` |
| 布局 | `packages/core/src/text/text-layout.ts`（或等价） |
| 行高 | `packages/core/src/text/row-height.ts` 或 layout 同目录 |
| 命令 / Engine | `command/types.ts`、`engine.ts`、`clipboard/style.ts` |
| 渲染 | `packages/core/src/render/canvas-renderer.ts` |
| IO | `packages/core/src/io/lucky-json.ts`（extras 提升） |
| UI | `ToolbarTextWrapSplit.vue`、`ToolbarTextRotateSplit.vue`、`Toolbar.vue` |
| 文档 | 实现后更新 `docs/FEATURE_MAP.md`（自动换行/旋转 → usable） |
