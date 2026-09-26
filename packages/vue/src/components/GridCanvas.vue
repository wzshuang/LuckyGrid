<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { ChromeState } from "../composables/useChromeState";
import type { SelectionRange, WorkbookEngine } from "@luckygrid/core";
import {
  buildColOffsets,
  buildRowOffsets,
  COL_HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
} from "@luckygrid/core";

const props = defineProps<{
  engine: WorkbookEngine;
  chrome: ChromeState;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);
const pendingChar = ref<string | null>(null);

let selecting = false;
let filling = false;
let fillFrom: SelectionRange | null = null;
let anchor = { row: 0, col: 0 };
let mods = { shift: false, ctrl: false };
let headerDrag: { kind: "row" | "col"; start: number } | null = null;
let resizing: {
  axis: "row" | "col";
  index: number;
  start: number;
  size: number;
} | null = null;
let resizeObs: ResizeObserver | null = null;

function measure() {
  const el = wrapRef.value;
  if (!el || !canvasRef.value) return;
  const rect = el.getBoundingClientRect();
  props.engine.setViewport(Math.max(100, rect.width), Math.max(100, rect.height));
}

onMounted(() => {
  if (canvasRef.value) {
    props.engine.attachCanvas(canvasRef.value);
    measure();
  }
  resizeObs = new ResizeObserver(() => measure());
  if (wrapRef.value) resizeObs.observe(wrapRef.value);
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  resizeObs?.disconnect();
  props.engine.detachCanvas();
  window.removeEventListener("keydown", onKeyDown);
});

watch(
  () => props.engine,
  (eng, prev) => {
    prev?.detachCanvas();
    if (canvasRef.value) eng.attachCanvas(canvasRef.value);
    measure();
  },
);

function gridPos(e: { clientX: number; clientY: number }) {
  const el = canvasRef.value ?? wrapRef.value!;
  const rect = el.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function rowGuideY(index: number): number {
  const offsets = buildRowOffsets(props.engine.workbook.getActiveSheet());
  return COL_HEADER_HEIGHT + (offsets[index] ?? 0) - props.engine.workbook.scrollTop;
}

function colGuideX(index: number): number {
  const offsets = buildColOffsets(props.engine.workbook.getActiveSheet());
  return ROW_HEADER_WIDTH + (offsets[index] ?? 0) - props.engine.workbook.scrollLeft;
}

function updateCursor(x: number, y: number) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  if (props.chrome.paintFormatActive.value) {
    canvas.style.cursor = "";
    return;
  }
  if (resizing) {
    canvas.style.cursor = resizing.axis === "row" ? "ns-resize" : "ew-resize";
    return;
  }
  if (props.engine.hitRowResize(x, y) != null) canvas.style.cursor = "ns-resize";
  else if (props.engine.hitColResize(x, y) != null) canvas.style.cursor = "ew-resize";
  else canvas.style.cursor = "";
}

function onPointerDown(e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  const { x, y } = gridPos(e);
  mods = { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey };

  if (props.engine.hitCorner(x, y)) {
    if (props.engine.editing) props.engine.commitEdit();
    props.engine.selectAll();
    wrapRef.value?.focus();
    return;
  }

  const resizeRow = props.engine.hitRowResize(x, y);
  if (resizeRow != null) {
    resizing = {
      axis: "row",
      index: resizeRow,
      start: e.clientY,
      size: props.engine.workbook.getActiveSheet().getRowHeight(resizeRow),
    };
    props.engine.setHeaderResizeGuide({ axis: "row", position: rowGuideY(resizeRow) });
    updateCursor(x, y);
    e.preventDefault();
    return;
  }
  const resizeCol = props.engine.hitColResize(x, y);
  if (resizeCol != null) {
    resizing = {
      axis: "col",
      index: resizeCol,
      start: e.clientX,
      size: props.engine.workbook.getActiveSheet().getColWidth(resizeCol),
    };
    props.engine.setHeaderResizeGuide({ axis: "col", position: colGuideX(resizeCol) });
    updateCursor(x, y);
    e.preventDefault();
    return;
  }

  const headerRow = props.engine.hitRowHeader(x, y);
  if (headerRow != null) {
    if (props.engine.editing) props.engine.commitEdit();
    headerDrag = { kind: "row", start: headerRow };
    props.engine.selectRow(headerRow, { shift: e.shiftKey });
    wrapRef.value?.focus();
    return;
  }
  const headerCol = props.engine.hitColHeader(x, y);
  if (headerCol != null) {
    if (props.engine.editing) props.engine.commitEdit();
    headerDrag = { kind: "col", start: headerCol };
    props.engine.selectColumn(headerCol, { shift: e.shiftKey });
    wrapRef.value?.focus();
    return;
  }

  if (props.engine.editing) {
    const hit = props.engine.hitTest(x, y);
    if (hit) {
      props.engine.commitEditAndSelect(hit.row, hit.col);
      selecting = true;
      anchor = hit;
      wrapRef.value?.focus();
    }
    return;
  }

  if (props.engine.getFillHandleAt(x, y)) {
    const sel = props.engine.getActiveRange();
    if (sel) {
      fillFrom = {
        row: [Math.min(sel.row[0], sel.row[1]), Math.max(sel.row[0], sel.row[1])],
        column: [
          Math.min(sel.column[0], sel.column[1]),
          Math.max(sel.column[0], sel.column[1]),
        ],
        row_focus: sel.row_focus,
        column_focus: sel.column_focus,
      };
      filling = true;
    }
    return;
  }

  const hit = props.engine.hitTest(x, y);
  if (!hit) return;
  selecting = true;
  anchor = hit;
  props.engine.selectAt(hit.row, hit.col, { shift: mods.shift, ctrl: mods.ctrl });
  wrapRef.value?.focus();
}

function onPointerMove(e: PointerEvent) {
  const { x, y } = gridPos(e);
  if (resizing) {
    if (resizing.axis === "row") {
      const height = Math.max(4, resizing.size + (e.clientY - resizing.start));
      props.engine.execute({ type: "setRowHeight", row: resizing.index, height });
      props.engine.setHeaderResizeGuide({ axis: "row", position: rowGuideY(resizing.index) });
    } else {
      const width = Math.max(4, resizing.size + (e.clientX - resizing.start));
      props.engine.execute({ type: "setColWidth", col: resizing.index, width });
      props.engine.setHeaderResizeGuide({ axis: "col", position: colGuideX(resizing.index) });
    }
    return;
  }
  if (headerDrag) {
    if (headerDrag.kind === "row") {
      const row = props.engine.hitRowHeader(x, y) ?? props.engine.hitTest(ROW_HEADER_WIDTH + 1, y)?.row;
      if (row != null) props.engine.selectRow(headerDrag.start, { endRow: row });
    } else {
      const col = props.engine.hitColHeader(x, y) ?? props.engine.hitTest(x, COL_HEADER_HEIGHT + 1)?.col;
      if (col != null) props.engine.selectColumn(headerDrag.start, { endCol: col });
    }
    return;
  }
  if (!selecting && !filling) updateCursor(x, y);
  if (filling && fillFrom) {
    const hit = props.engine.hitTest(x, y);
    if (!hit) return;
    props.engine.execute({
      type: "setSelection",
      selection: [
        {
          row: [fillFrom.row[0], hit.row],
          column: [fillFrom.column[0], hit.col],
          row_focus: fillFrom.row_focus ?? fillFrom.row[0],
          column_focus: fillFrom.column_focus ?? fillFrom.column[0],
        },
      ],
    });
    return;
  }
  if (!selecting) return;
  const hit = props.engine.hitTest(x, y);
  if (!hit) return;
  const rest = props.engine.selection.slice(0, -1);
  props.engine.execute({
    type: "setSelection",
    selection: [
      ...rest,
      {
        row: [anchor.row, hit.row],
        column: [anchor.col, hit.col],
        row_focus: anchor.row,
        column_focus: anchor.col,
      },
    ],
  });
}

function onPointerUp() {
  if (resizing || headerDrag) {
    props.engine.setHeaderResizeGuide(null);
  }
  resizing = null;
  headerDrag = null;
  if (canvasRef.value && !props.chrome.paintFormatActive.value) {
    canvasRef.value.style.cursor = "";
  }
  if (filling && fillFrom) {
    const sel = props.engine.getActiveRange();
    if (sel) {
      props.engine.execute({ type: "fillCells", from: fillFrom, to: sel });
    }
  }
  if (props.engine.isPaintFormatActive()) {
    props.engine.applyPaintFormatToSelection();
  }
  selecting = false;
  filling = false;
  fillFrom = null;
  mods = { shift: false, ctrl: false };
}

function onDblClick(e: MouseEvent) {
  const { x, y } = gridPos(e);
  if (
    props.engine.hitCorner(x, y) ||
    props.engine.hitRowHeader(x, y) != null ||
    props.engine.hitColHeader(x, y) != null
  ) {
    return;
  }
  props.engine.startEdit();
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  props.engine.execute({
    type: "setScroll",
    scrollLeft: props.engine.workbook.scrollLeft + e.deltaX,
    scrollTop: props.engine.workbook.scrollTop + e.deltaY,
  });
}

async function writeSystemClipboard(): Promise<void> {
  const text = props.engine.getClipboardTsv();
  const html = props.engine.getClipboardHtml();
  if (text == null) return;
  try {
    const nav = navigator.clipboard;
    if (nav && "write" in nav && typeof ClipboardItem !== "undefined" && html) {
      await nav.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    }
    if (nav?.writeText) await nav.writeText(text);
  } catch {
    // Permission / insecure context — in-memory clipboard still works
  }
}

async function pasteWithSystemClipboard(): Promise<void> {
  if (props.engine.workbook.clipboard) {
    props.engine.pasteAtSelection();
    return;
  }
  try {
    const nav = navigator.clipboard;
    if (nav && "read" in nav) {
      const items = await nav.read();
      let html: string | undefined;
      let text: string | undefined;
      for (const item of items) {
        if (item.types.includes("text/html")) {
          html = await (await item.getType("text/html")).text();
        }
        if (item.types.includes("text/plain")) {
          text = await (await item.getType("text/plain")).text();
        }
      }
      if (props.engine.pasteFromExternal({ html, text })) return;
    } else if (nav?.readText) {
      const text = await nav.readText();
      if (props.engine.pasteFromExternal({ text })) return;
    }
  } catch {
    // fall through
  }
  props.engine.pasteAtSelection();
}

function onKeyDown(e: KeyboardEvent) {
  if (!wrapRef.value?.contains(document.activeElement) && document.activeElement !== wrapRef.value) {
    return;
  }
  if (props.engine.editing) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
    e.preventDefault();
    props.engine.selectAll();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
    e.preventDefault();
    props.engine.copySelection();
    void writeSystemClipboard();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
    e.preventDefault();
    props.engine.cutSelection();
    void writeSystemClipboard();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    e.preventDefault();
    void pasteWithSystemClipboard();
    return;
  }
  if (e.key === "Escape") {
    if (props.engine.isPaintFormatActive()) {
      e.preventDefault();
      props.engine.cancelPaintFormat();
      return;
    }
    if (props.engine.workbook.copyHighlight) {
      e.preventDefault();
      props.engine.clearCopyHighlight();
      return;
    }
  }

  const focus = props.engine.getFocusCell();
  if (!focus) return;
  let r = focus.row;
  let c = focus.col;

  if (e.key === "ArrowUp") {
    e.preventDefault();
    props.engine.moveFocus(-1, 0, { shift: e.shiftKey });
    return;
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    props.engine.moveFocus(1, 0, { shift: e.shiftKey });
    return;
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    props.engine.moveFocus(0, -1, { shift: e.shiftKey });
    return;
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    props.engine.moveFocus(0, 1, { shift: e.shiftKey });
    return;
  } else if (e.key === "Tab") {
    e.preventDefault();
    props.engine.moveFocus(0, e.shiftKey ? -1 : 1);
    return;
  } else if (e.key === "Enter" || e.key === "F2") {
    e.preventDefault();
    props.engine.startEdit(r, c);
    return;
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    props.engine.clearSelectionContent();
    return;
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) props.engine.redo();
    else props.engine.undo();
    return;
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    props.engine.redo();
    return;
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    props.engine.startEdit(r, c);
    props.engine.workbook.emit({ type: "edit", editing: true, row: r, col: c });
    pendingChar.value = e.key;
  }
}

defineExpose({ pendingChar });
</script>

<template>
  <div
    ref="wrapRef"
    class="ls3-grid"
    :class="{ 'ls3-grid--paint': props.chrome.paintFormatActive.value }"
    tabindex="0"
    @wheel="onWheel"
  >
    <canvas
      ref="canvasRef"
      class="ls3-grid__canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="onDblClick"
    />
    <slot :pending-char="pendingChar" :clear-pending="() => (pendingChar = null)" />
  </div>
</template>

<style scoped>
.ls3-grid {
  position: relative;
  flex: 1;
  min-height: 0;
  outline: none;
  overflow: hidden;
  background: #fff;
}
.ls3-grid--paint {
  cursor: cell;
}
.ls3-grid__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
