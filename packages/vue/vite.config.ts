import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "LuckyGridVue",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: ["vue", "@luckygrid/core"],
      output: {
        exports: "named",
        assetFileNames: "LuckyGrid-vue.[ext]",
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
  },
});
