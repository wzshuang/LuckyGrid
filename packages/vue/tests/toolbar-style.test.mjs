import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconfontPath = path.join(root, "src/assets/iconfont/iconfont.css");

const GLYPHS = [
  "qianjin",
  "houtui",
  "geshishua",
  "xiayige",
  "youjiantou",
  "qingchuyangshi",
  "jiacu",
  "wenbenqingxie1",
  "wenbenshanchuxian",
  "wenbenxiahuaxian",
  "wenbenyanse",
  "tianchong",
  "quanjiabiankuang",
  "sizhoujiabiankuang",
  "wubiankuang",
  "hebing",
  "quxiaohebing",
  "wenbenzuoduiqi",
  "wenbenjuzhongduiqi",
  "wenbenyouduiqi",
  "dingbuduiqi",
  "shuipingduiqi",
  "dibuduiqi",
  "hang",
  "jian1",
  "lie",
  "yichu1",
  "zidonghuanhang",
  "jieduan",
  "wuxuanzhuang",
  "xiangshangqingxie",
  "xiangxiaqingxie",
  "shupaiwenzi",
  "wenbenxiangshang",
  "xiangxia90",
  "dongjie1",
  "dongjie",
  "qingchu",
  "sousuo",
];

describe("iconfont asset", () => {
  it("exists with woff2 data URI only and required glyphs", () => {
    const css = fs.readFileSync(iconfontPath, "utf8");
    assert.match(css, /font-family:\s*"iconfont-luckysheet"/);
    assert.match(css, /data:application\/x-font-woff2/);
    assert.doesNotMatch(css, /url\(['"]iconfont\.(eot|woff|ttf|svg)/);
    for (const name of GLYPHS) {
      assert.match(css, new RegExp(`\\.luckysheet-iconfont-${name}:before`));
    }
  });
});

const toolbarCssPath = path.join(root, "src/styles/toolbar.css");
const indexPath = path.join(root, "src/index.ts");

describe("toolbar.css tokens", () => {
  it("imports iconfont and uses original chrome tokens", () => {
    const css = fs.readFileSync(toolbarCssPath, "utf8");
    const indexSrc = fs.readFileSync(indexPath, "utf8");
    assert.match(indexSrc, /import "\.\/styles\/toolbar\.css"/);
    assert.match(css, /@import "\.\.\/assets\/iconfont\/iconfont\.css"/);
    assert.match(css, /background:\s*#fafafc/);
    assert.match(css, /border-bottom:\s*1px solid #d4d4d4/);
    assert.match(css, /height:\s*26px/);
    assert.match(css, /border-radius:\s*2px/);
    assert.match(css, /rgba\(0,\s*0,\s*0,\s*\.06\)/);
    assert.match(css, /rgba\(0,\s*0,\s*0,\s*\.12\)/);
    assert.match(css, /\.ls3-toolbar__menu/);
    assert.match(css, /min-width:\s*120px/);
    assert.match(css, /#efefef/);
    assert.doesNotMatch(css, /#e6f4ff/);
  });
});

const buttonPath = path.join(root, "src/components/ToolbarButton.vue");

describe("ToolbarButton.vue", () => {
  it("renders icon class from short name and has no default text slot", () => {
    const sfc = fs.readFileSync(buttonPath, "utf8");
    assert.match(sfc, /defineProps/);
    assert.match(sfc, /luckysheet-iconfont-\$\{icon\}/);
    assert.match(sfc, /ls3-toolbar__btn/);
    assert.match(sfc, /is-on/);
    assert.match(sfc, /type="button"/);
    assert.doesNotMatch(sfc, /<slot/);
  });
});

const toolbarVuePath = path.join(root, "src/components/Toolbar.vue");

describe("Toolbar.vue markup", () => {
  it("uses Chinese titles, original glyphs, split/combo, no english labels", () => {
    const sfc = fs.readFileSync(toolbarVuePath, "utf8");
    assert.match(sfc, /import ToolbarButton from "\.\/ToolbarButton\.vue"/);
    assert.match(sfc, /title="撤销"/);
    assert.match(sfc, /title="查找替换"/);
    assert.match(sfc, /icon="qianjin"/);
    assert.match(sfc, /icon="geshishua"/);
    assert.match(sfc, /ls3-toolbar__split--color/);
    assert.match(sfc, /ls3-toolbar__combo--size/);
    assert.match(sfc, /ls3-toolbar__combo--format/);
    assert.match(sfc, /import ToolbarAlignSplit from "\.\/ToolbarAlignSplit\.vue"/);
    assert.match(sfc, /import ToolbarBorderSplit from "\.\/ToolbarBorderSplit\.vue"/);
    assert.match(sfc, /ToolbarBorderSplit/);
    assert.match(sfc, /ToolbarTextWrapSplit/);
    assert.match(sfc, /ToolbarTextRotateSplit/);
    assert.doesNotMatch(sfc, /icon="quanjiabiankuang"/);
    assert.match(sfc, /axis="horizontal"/);
    assert.match(sfc, /axis="vertical"/);
    assert.doesNotMatch(sfc, /icon="wenbenzuoduiqi"/);
    assert.doesNotMatch(sfc, /title="左对齐"/);
    assert.match(sfc, /luckysheet-iconfont-wenbenyanse/);
    assert.match(sfc, /luckysheet-iconfont-tianchong/);
    assert.doesNotMatch(sfc, />Undo</);
    assert.doesNotMatch(sfc, />Redo</);
    assert.doesNotMatch(sfc, />Left</);
    assert.doesNotMatch(sfc, />Clear Fmt</);
    assert.doesNotMatch(sfc, /<style scoped>/);

    const icons = [...sfc.matchAll(/icon="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(icons, [
      "qianjin",
      "houtui",
      "geshishua",
      "qingchuyangshi",
      "jiacu",
      "wenbenqingxie1",
      "wenbenshanchuxian",
      "wenbenxiahuaxian",
      "hebing",
      "quxiaohebing",
      "hang",
      "jian1",
      "lie",
      "yichu1",
      "dongjie1",
      "dongjie",
      "dongjie1",
      "qingchu",
      "sousuo",
    ]);
  });
});

const alignSplitPath = path.join(root, "src/components/ToolbarAlignSplit.vue");

const borderSplitPath = path.join(root, "src/components/ToolbarBorderSplit.vue");

describe("ToolbarBorderSplit.vue", () => {
  it("defines border menu items and color input", () => {
    const sfc = fs.readFileSync(borderSplitPath, "utf8");
    assert.match(sfc, /border-top/);
    assert.match(sfc, /border-inside/);
    assert.match(sfc, /边框颜色/);
    assert.match(sfc, /边框粗细/);
    assert.match(sfc, /上框线/);
    assert.match(sfc, /title: "无"/);
    assert.match(sfc, /showSubPanel\('color'\)/);
    assert.match(sfc, /showSubPanel\('style'\)/);
    assert.match(sfc, /BORDER_LINE_STYLE_MENU/);
    assert.match(sfc, /label: "无"/);
    assert.match(sfc, /luckysheet-iconfont-youjiantou/);
    assert.match(sfc, /ToolbarBorderLinePreview/);
    assert.match(sfc, /ls3-toolbar__border-size-preview/);
    assert.match(sfc, /BORDER_MENU_SIZE_PREVIEW_W/);
    assert.match(sfc, /menu-label--border-size/);
  });
});

describe("ToolbarAlignSplit.vue", () => {
  it("merges horizontal and vertical align into split menus", () => {
    const sfc = fs.readFileSync(alignSplitPath, "utf8");
    assert.match(sfc, /ls3-toolbar__menu/);
    assert.match(sfc, /ls3-toolbar__split--align/);
    assert.match(sfc, /wenbenzuoduiqi/);
    assert.match(sfc, /wenbenjuzhongduiqi/);
    assert.match(sfc, /wenbenyouduiqi/);
    assert.match(sfc, /dingbuduiqi/);
    assert.match(sfc, /shuipingduiqi/);
    assert.match(sfc, /dibuduiqi/);
    assert.match(sfc, /title: "左对齐"/);
    assert.match(sfc, /applyStyleToSelection\(\{ ht: value \}\)/);
    assert.match(sfc, /applyStyleToSelection\(\{ vt: value \}\)/);
  });
});

const wrapPath = path.join(root, "src/components/ToolbarTextWrapSplit.vue");
const rotatePath = path.join(root, "src/components/ToolbarTextRotateSplit.vue");

describe("ToolbarTextWrapSplit.vue", () => {
  it("has three wrap modes and applies tb", () => {
    const sfc = fs.readFileSync(wrapPath, "utf8");
    assert.match(sfc, /溢出/);
    assert.match(sfc, /自动换行/);
    assert.match(sfc, /截断/);
    assert.match(sfc, /applyStyleToSelection\(\{\s*tb:/);
  });
});

describe("ToolbarTextRotateSplit.vue", () => {
  it("has six rotate modes and applies tr", () => {
    const sfc = fs.readFileSync(rotatePath, "utf8");
    assert.match(sfc, /无旋转/);
    assert.match(sfc, /竖排文字/);
    assert.match(sfc, /向上90/);
    assert.match(sfc, /applyStyleToSelection\(\{\s*tr:/);
  });
});
