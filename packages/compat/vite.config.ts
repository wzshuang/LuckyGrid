import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "LuckyGridCompat",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: ["vue", "@luckygrid/core", "@luckygrid/vue"],
      output: { exports: "named" },
    },
    sourcemap: true,
    minify: false,
  },
});
