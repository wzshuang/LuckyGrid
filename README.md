# LuckyGrid

基于 **Vue 3 + TypeScript** 的 [Luckysheet](https://github.com/dream-num/Luckysheet) 现代化重写。采用「**框架无关引擎 + Vue 外壳**」架构（路径 A），在保留 Luckysheet 数据协议与交互习惯的前提下，用可测试的 TypeScript 核心替代原版 jQuery + 全局 Store 的实现。

## 为什么重写

原版 Luckysheet 已停止维护，代码体量大（约 16 万行）、强依赖 jQuery 与全局状态，难以在现代 Vue 技术栈中集成与演进。直接把网格做成 Vue 组件树会在万级单元格下拖垮性能，因此本仓库**不把每个单元格做成 VNode**，而是：

- **Canvas 视口绘制**网格（滚动、冻结、合并等与原版同类方案）
- **Vue 3** 负责工具栏、公式栏、Sheet 标签栏、对话框等 Chrome UI
- **命令总线 + 撤销重做**统一变更入口，便于扩展协同与测试

## 架构概览

```
Vue 3 Host（<LuckyGrid> / provide）
├── Chrome UI（Toolbar / FormulaBar / SheetBar / 对话框）
│       └── 通过 Command Bus 修改文档
└── Workbook Engine（@luckygrid/core，零 vue 依赖）
    ├── Sheet Model（稀疏单元格、合并、行列尺寸）
    ├── Canvas Renderer（视口绘制）
    ├── Formula（解析与重算，内置函数约 22 个）
    └── IO（Lucky JSON 导入导出）
```

## 当前能力（摘要）

| 领域 | 说明 |
| --- | --- |
| 编辑与导航 | 双击/键盘编辑、方向键与选区、滚动、行列拖拽调宽高 |
| 格式 | 字体样式、对齐、换行/旋转、边框、部分数字格式 |
| 结构 | 合并单元格、插入/删除行列、冻结、多 Sheet 增删重命名 |
| 剪贴板 | TSV / HTML 粘贴、格式刷、填充柄 |
| 查找 | 查找与替换对话框 |
| 公式 | 基础公式链（规模远小于原版 374 个函数） |
| 协同 | 仅 `emit('op')` 钩子，**无** WebSocket / OT |
| 未实现 | 透视表、图表、条件格式、数据校验、插件、完整 `api.js` 等 |

## Monorepo 包

| 包名 | 说明 |
| --- | --- |
| [`@luckygrid/core`](packages/core) | 工作簿引擎：模型、Canvas 渲染、命令、公式、Lucky JSON |
| [`@luckygrid/vue`](packages/vue) | `<LuckyGrid>` 组件与 `useLuckyGrid` 等 composables |
| [`@luckygrid/compat`](packages/compat) | 可选的旧式 imperative API（`create` / `getCellValue` / `setCellValue` 等，**非**完整 109 个 API） |
| [`@luckygrid/playground`](apps/playground) | 本地演示与原版对比页 |

## 快速开始

### 环境要求

- Node.js **≥ 20**
- [pnpm](https://pnpm.io/) **11**（见根目录 `packageManager` 字段）

### 运行演示

```bash
pnpm install
pnpm dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)。演示包含组件用法与 Compat API 示例。

### 在 Vue 3 中使用（示意）

先构建各 package（`pnpm build`），再在应用中安装 workspace 或发布后的包：

```vue
<script setup lang="ts">
import { LuckyGrid } from "@luckygrid/vue";
import "@luckygrid/vue/style.css";
import sheetData from "./sheet-mini.json";
</script>

<template>
  <LuckyGrid :data="[sheetData]" lang="zh" @op="(op) => console.log(op)" />
</template>
```

需要与旧项目类似的挂载方式时，可使用 compat 层：

```ts
import luckygrid, { luckysheet } from "@luckygrid/compat";

luckygrid.create({
  container: "app",
  data: [/* LuckyGridRaw[] */],
  onOp: (op) => console.log(op),
});
// luckysheet.create(...) 等价
```

## 开发

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动 playground
pnpm test             # 运行 core 单元测试（Vitest）
pnpm typecheck        # 各 package TypeScript 检查
pnpm build            # 构建 packages/*
```

测试与类型检查主要集中在 `@luckygrid/core`；fixtures 样例数据在 [`fixtures/lucky/`](fixtures/lucky/)。

## 与原版 Luckysheet 的关系

- **独立项目**：LuckyGrid 与 [Luckysheet](https://github.com/dream-num/Luckysheet) 项目及其作者、维护方无任何隶属、授权或官方合作关系，仅为名称与部分交互习惯上的参考。
- **数据格式**：为便于迁移旧表格数据，引擎尽力兼容常见的 Lucky Sheet JSON 导入导出（`fromLuckyFile` / `toLuckyFile`），部分扩展字段仅透传，**不表示**与原项目协议或行为完全一致。

## 许可证

本项目采用 [MIT License](LICENSE) 发布。
