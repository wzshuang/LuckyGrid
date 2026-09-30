/**
 * 从同级 LuckysheetDemo 重新生成 fixtures/lucky/sheet-*.json
 * 顺序与 Demo create().data 一致。
 * 用法（在仓库根目录）: node apps/playground/scripts/extract-demo-sheets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** Sibling of LuckyGrid: D:/dev/github/LuckysheetDemo */
const demoDir = path.resolve(here, "../../../../LuckysheetDemo/demoData");
const outDir = path.resolve(here, "../../../fixtures/lucky");

/** Same order as LuckysheetDemo/index.html options.data */
const SHEETS = [
  { file: "sheetCell.js", key: "sheetCell", out: "sheet-cell.json" },
  { file: "sheetFormula.js", key: "sheetFormula", out: "sheet-formula.json" },
  {
    file: "sheetConditionFormat.js",
    key: "sheetConditionFormat",
    out: "sheet-condition-format.json",
  },
  { file: "sheetSparkline.js", key: "sheetSparkline", out: "sheet-sparkline.json" },
  { file: "sheetTable.js", key: "sheetTable", out: "sheet-table.json" },
  { file: "sheetComment.js", key: "sheetComment", out: "sheet-comment.json" },
  {
    file: "sheetPivotTableData.js",
    key: "sheetPivotTableData",
    out: "sheet-pivot-table-data.json",
  },
  { file: "sheetPivotTable.js", key: "sheetPivotTable", out: "sheet-pivot-table.json" },
  { file: "sheetChart.js", key: "sheetChart", out: "sheet-chart.json" },
  { file: "sheetPicture.js", key: "sheetPicture", out: "sheet-picture.json" },
  {
    file: "sheetDataVerification.js",
    key: "sheetDataVerification",
    out: "sheet-data-verification.json",
  },
];

if (!fs.existsSync(demoDir)) {
  console.error("找不到:", demoDir);
  process.exit(1);
}

const ctx = vm.createContext({ window: {} });
for (const { file } of SHEETS) {
  const p = path.join(demoDir, file);
  if (!fs.existsSync(p)) {
    console.error("找不到:", p);
    process.exit(1);
  }
  vm.runInContext(fs.readFileSync(p, "utf8"), ctx);
}

fs.mkdirSync(outDir, { recursive: true });

const manifest = [];

for (let i = 0; i < SHEETS.length; i++) {
  const { key, out } = SHEETS[i];
  const sheet = ctx.window[key];
  if (!sheet || typeof sheet !== "object") {
    console.error("未导出 window." + key);
    process.exit(1);
  }

  // Preserve demo fields; normalize status so only Cell is active by default.
  const status =
    sheet.status != null
      ? Number(sheet.status)
      : key === "sheetCell"
        ? 1
        : 0;

  const normalized = {
    ...sheet,
    name: sheet.name ?? key,
    index: sheet.index ?? i,
    order: sheet.order != null ? sheet.order : i,
    status: key === "sheetCell" ? 1 : status === 1 ? 0 : status,
    row: sheet.row,
    column: sheet.column,
    config: sheet.config ?? {},
    celldata: sheet.celldata ?? [],
  };

  const outPath = path.join(outDir, out);
  fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2));
  manifest.push({
    out,
    name: normalized.name,
    index: normalized.index,
    order: normalized.order,
    status: normalized.status,
    celldata: normalized.celldata?.length ?? 0,
  });
  console.log(
    "Wrote",
    out,
    "name=",
    normalized.name,
    "celldata=",
    normalized.celldata?.length ?? 0,
  );
}

fs.writeFileSync(
  path.join(outDir, "demo-workbook.manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log("Done,", manifest.length, "sheets");
