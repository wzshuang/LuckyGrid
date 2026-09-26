/**
 * Luckysheet zh `fontarray`. Cell `ff` is an index into this list
 * (`src/locale/zh.js` in Luckysheet 2.x).
 */
export const LUCKY_FONT_FAMILIES = [
  "Times New Roman",
  "Arial",
  "Tahoma",
  "Verdana",
  "微软雅黑",
  "宋体",
  "黑体",
  "楷体",
  "仿宋",
  "新宋体",
  "华文新魏",
  "华文行楷",
  "华文隶书",
] as const;

/** Same fallback tail as `luckysheetfontformat` when `ff` is unset. */
const FONT_FALLBACK =
  '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';

function quoteFamily(name: string): string {
  const cleaned = name.replace(/"/g, "").replace(/'/g, "");
  return /[\s,]/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

/** CSS/canvas font-family stack for a Lucky `ff` value. Missing `ff` is Times New Roman. */
export function luckyFontFamilyStack(ff?: number | string | null): string {
  let primary: string = LUCKY_FONT_FAMILIES[0];
  if (typeof ff === "number" && Number.isFinite(ff)) {
    primary = LUCKY_FONT_FAMILIES[ff] ?? LUCKY_FONT_FAMILIES[0];
  } else if (typeof ff === "string" && ff !== "") {
    const asIndex = /^\d+$/.test(ff) ? Number(ff) : NaN;
    if (Number.isFinite(asIndex)) {
      primary = LUCKY_FONT_FAMILIES[asIndex] ?? LUCKY_FONT_FAMILIES[0];
    } else {
      primary = ff;
    }
  }
  return `${quoteFamily(primary)}, ${FONT_FALLBACK}`;
}

type FontCell = {
  fs?: number | string | null;
  bl?: number | null;
  it?: number | null;
  ff?: number | string | null;
} | null | undefined;

/**
 * Luckysheet `luckysheetfontformat`: missing `fs` is 10pt, otherwise `Math.ceil`.
 * Sheet JSON often stores the size as a string (`"12"`).
 */
export function luckyFontSize(fs: unknown): number {
  if (fs == null || fs === "" || fs === 0 || fs === false) return 10;
  const n = typeof fs === "number" ? fs : Number(fs);
  if (!Number.isFinite(n)) return 10;
  return Math.ceil(n);
}

/** Canvas `font` string aligned with Luckysheet `luckysheetfontformat`. */
export function cellCanvasFont(cell: FontCell): string {
  const fs = luckyFontSize(cell?.fs);
  const bold = cell?.bl ? "bold " : "";
  const italic = cell?.it ? "italic " : "";
  return `${italic}${bold}${fs}pt ${luckyFontFamilyStack(cell?.ff)}`;
}
