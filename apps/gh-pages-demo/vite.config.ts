import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: "@luckygrid/vue/style.css",
        replacement: resolve(__dirname, "../../packages/vue/src/styles/toolbar.css"),
      },
      {
        find: "@luckygrid/core",
        replacement: resolve(__dirname, "../../packages/core/src/index.ts"),
      },
      {
        find: "@luckygrid/vue",
        replacement: resolve(__dirname, "../../packages/vue/src/index.ts"),
      },
      {
        find: "@luckygrid/compat",
        replacement: resolve(__dirname, "../../packages/compat/src/index.ts"),
      },
    ],
  },
});
