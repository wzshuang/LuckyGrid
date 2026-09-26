# LuckyGrid 在线 Demo（GitHub Pages）

与 `apps/playground` 独立：左侧功能菜单，右侧上预览、下可编辑代码（改完自动重跑）。

## 本地

```bash
pnpm dev:site
# 模拟 Pages 子路径：
# BASE_PATH=/LuckyGrid/ pnpm --filter @luckygrid/gh-pages-demo dev
```

## 构建

```bash
BASE_PATH=/LuckyGrid/ pnpm build:site
```

## 代码约定

编辑区是一段 **函数体**，必须以 `return { ... }` 结束：

**组件示例**

```js
return {
  kind: "component",
  lang: "zh",
  data: [ /* LuckyGridRaw[] */ ],
  showOpLog: true, // 可选：显示 @op JSON
};
```

**Compat 示例**

```js
return {
  kind: "compat",
  containerId: "compat-host",
  data: [ /* LuckyGridRaw[] */ ],
};
```

## 发布

`main` 推送后 workflow `.github/workflows/deploy-gh-pages-demo.yml` 会构建并推送到 **`gh-pages` 分支**。

仓库 **Settings → Pages → Build and deployment → Branch: `gh-pages` / `/ (root)`**。

站点 URL：`https://<user>.github.io/LuckyGrid/`
