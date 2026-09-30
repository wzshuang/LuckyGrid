<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  COL_HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
  drawPostilArrow,
  getArrowCanvasSize,
  type CellPostil,
  type WorkbookEngine,
} from "@luckygrid/core";

const props = defineProps<{
  engine: WorkbookEngine;
}>();

type Geo = { left: number; top: number; width: number; height: number };

type BubbleItem = {
  row: number;
  col: number;
  ps: CellPostil;
  active: boolean;
  hover: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  toX: number;
  toY: number;
  arrow: {
    left: number;
    top: number;
    width: number;
    height: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
};

const rev = ref(0);
const hoverCell = ref<{ row: number; col: number } | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const editorRefs = new Map<string, HTMLElement>();
/** Content-space geometry override while dragging */
const dragGeo = ref<{ row: number; col: number; geo: Geo } | null>(null);

let off: (() => void) | undefined;
let drag:
  | {
      kind: "move" | "resize";
      row: number;
      col: number;
      type?: string;
      startX: number;
      startY: number;
      left: number;
      top: number;
      width: number;
      height: number;
    }
  | null = null;

const MIN_W = 36;
const MIN_H = 24;

function keyOf(r: number, c: number) {
  return `${r}_${c}`;
}

function bump() {
  rev.value++;
}

function contentGeo(row: number, col: number): Geo & { toX: number; toY: number } {
  const layout = props.engine.getPostilLayout(row, col);
  const override = dragGeo.value;
  if (override && override.row === row && override.col === col) {
    return { ...override.geo, toX: layout.toX, toY: layout.toY };
  }
  return {
    left: layout.left,
    top: layout.top,
    width: layout.width,
    height: layout.height,
    toX: layout.toX,
    toY: layout.toY,
  };
}

function toView(geo: Geo & { toX: number; toY: number }) {
  const scrollLeft = props.engine.workbook.scrollLeft;
  const scrollTop = props.engine.workbook.scrollTop;
  // getPostilLayout already returns view* for current sheet ps; rebuild from content
  const { ROW_HEADER_WIDTH, COL_HEADER_HEIGHT } = viewConsts();
  const viewLeft = ROW_HEADER_WIDTH + geo.left - scrollLeft;
  const viewTop = COL_HEADER_HEIGHT + geo.top - scrollTop;
  const viewToX = ROW_HEADER_WIDTH + geo.toX - scrollLeft;
  const viewToY = COL_HEADER_HEIGHT + geo.toY - scrollTop;
  const size = getArrowCanvasSize(viewLeft, viewTop, viewToX, viewToY);
  return {
    left: viewLeft,
    top: viewTop,
    width: geo.width,
    height: geo.height,
    toX: viewToX,
    toY: viewToY,
    arrow: {
      left: size[0],
      top: size[1],
      width: size[2],
      height: size[3],
      x1: size[4],
      y1: size[5],
      x2: size[6],
      y2: size[7],
    },
  };
}

function viewConsts() {
  return { ROW_HEADER_WIDTH, COL_HEADER_HEIGHT };
}

const bubbles = computed((): BubbleItem[] => {
  void rev.value;
  void dragGeo.value;
  const active = props.engine.getActiveComment();
  const list = props.engine.listPostils();
  const items: BubbleItem[] = [];
  const seen = new Set<string>();

  for (const { row, col, ps } of list) {
    const isActive = active?.row === row && active?.col === col;
    if (!ps.isshow && !isActive) continue;
    const geo = toView(contentGeo(row, col));
    items.push({ row, col, ps, active: isActive, hover: false, ...geo });
    seen.add(keyOf(row, col));
  }

  if (active && !seen.has(keyOf(active.row, active.col))) {
    const ps = props.engine.getPostil(active.row, active.col);
    if (ps) {
      const geo = toView(contentGeo(active.row, active.col));
      items.push({
        row: active.row,
        col: active.col,
        ps,
        active: true,
        hover: false,
        ...geo,
      });
      seen.add(keyOf(active.row, active.col));
    }
  }

  const h = hoverCell.value;
  if (h && !seen.has(keyOf(h.row, h.col))) {
    const ps = props.engine.getPostil(h.row, h.col);
    if (ps && !ps.isshow) {
      const geo = toView(contentGeo(h.row, h.col));
      items.push({ row: h.row, col: h.col, ps, active: false, hover: true, ...geo });
    }
  }

  return items;
});

function setEditorRef(row: number, col: number, el: unknown) {
  const k = keyOf(row, col);
  if (el instanceof HTMLElement) {
    editorRefs.set(k, el);
    // Sync HTML only when not focused to avoid caret jumps
    if (document.activeElement !== el) {
      el.innerHTML = editorHtml(props.engine.getPostil(row, col)?.value);
    }
  } else {
    editorRefs.delete(k);
  }
}

function focusEditor(row: number, col: number) {
  nextTick(() => {
    const el = editorRefs.get(keyOf(row, col));
    if (!el) return;
    el.innerHTML = editorHtml(props.engine.getPostil(row, col)?.value);
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  });
}

function readEditorText(el: HTMLElement): string {
  const blocks = el.querySelectorAll("div");
  if (blocks.length > 0) {
    return Array.from(blocks)
      .map((d) => d.innerText.replace(/\n$/, ""))
      .join("\n");
  }
  return el.innerText;
}

function commitActive(row: number, col: number) {
  const el = editorRefs.get(keyOf(row, col));
  if (!el) return;
  const value = readEditorText(el);
  const prev = props.engine.getPostil(row, col)?.value ?? "";
  if (value !== prev) props.engine.updateCommentValue(row, col, value);
}

function activate(row: number, col: number) {
  const cur = props.engine.getActiveComment();
  if (cur && (cur.row !== row || cur.col !== col)) commitActive(cur.row, cur.col);
  props.engine.setActiveComment({ row, col });
  focusEditor(row, col);
}

function deactivate() {
  const cur = props.engine.getActiveComment();
  if (!cur) return;
  commitActive(cur.row, cur.col);
  props.engine.setActiveComment(null);
}

function onBubblePointerDown(e: PointerEvent, item: BubbleItem) {
  if (item.hover) return;
  e.stopPropagation();
  activate(item.row, item.col);
}

function onMoveDown(e: PointerEvent, item: BubbleItem) {
  e.preventDefault();
  e.stopPropagation();
  activate(item.row, item.col);
  const g = contentGeo(item.row, item.col);
  drag = {
    kind: "move",
    row: item.row,
    col: item.col,
    startX: e.clientX,
    startY: e.clientY,
    left: g.left,
    top: g.top,
    width: g.width,
    height: g.height,
  };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragUp);
}

function onResizeDown(e: PointerEvent, item: BubbleItem, type: string) {
  e.preventDefault();
  e.stopPropagation();
  activate(item.row, item.col);
  const g = contentGeo(item.row, item.col);
  drag = {
    kind: "resize",
    type,
    row: item.row,
    col: item.col,
    startX: e.clientX,
    startY: e.clientY,
    left: g.left,
    top: g.top,
    width: g.width,
    height: g.height,
  };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragUp);
}

function applyResize(type: string, base: Geo, dx: number, dy: number): Geo {
  let { left, top, width, height } = base;
  switch (type) {
    case "lt":
      width = Math.max(MIN_W, base.width - dx);
      height = Math.max(MIN_H, base.height - dy);
      left = base.left + (base.width - width);
      top = base.top + (base.height - height);
      break;
    case "mt":
      height = Math.max(MIN_H, base.height - dy);
      top = base.top + (base.height - height);
      break;
    case "rt":
      width = Math.max(MIN_W, base.width + dx);
      height = Math.max(MIN_H, base.height - dy);
      top = base.top + (base.height - height);
      break;
    case "lm":
      width = Math.max(MIN_W, base.width - dx);
      left = base.left + (base.width - width);
      break;
    case "rm":
      width = Math.max(MIN_W, base.width + dx);
      break;
    case "lb":
      width = Math.max(MIN_W, base.width - dx);
      height = Math.max(MIN_H, base.height + dy);
      left = base.left + (base.width - width);
      break;
    case "mb":
      height = Math.max(MIN_H, base.height + dy);
      break;
    case "rb":
    default:
      width = Math.max(MIN_W, base.width + dx);
      height = Math.max(MIN_H, base.height + dy);
      break;
  }
  return { left, top, width, height };
}

function onDragMove(e: PointerEvent) {
  if (!drag) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  const base = {
    left: drag.left,
    top: drag.top,
    width: drag.width,
    height: drag.height,
  };
  const geo =
    drag.kind === "move"
      ? { left: drag.left + dx, top: Math.max(0, drag.top + dy), width: drag.width, height: drag.height }
      : applyResize(drag.type ?? "rb", base, dx, dy);
  dragGeo.value = { row: drag.row, col: drag.col, geo };
}

function onDragUp() {
  if (drag && dragGeo.value) {
    const { row, col, geo } = dragGeo.value;
    props.engine.updateCommentGeometry(row, col, geo);
  }
  drag = null;
  dragGeo.value = null;
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragUp);
  bump();
}

function paintArrows() {
  nextTick(() => {
    const root = rootRef.value;
    if (!root) return;
    for (const item of bubbles.value) {
      const canvas = root.querySelector(
        `canvas[data-comment-arrow="${keyOf(item.row, item.col)}"]`,
      ) as HTMLCanvasElement | null;
      if (!canvas) continue;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPostilArrow(ctx, item.arrow.x1, item.arrow.y1, item.arrow.x2, item.arrow.y2);
    }
  });
}

watch(bubbles, () => paintArrows(), { deep: true, flush: "post" });

function onHostPointerMove(e: PointerEvent) {
  if (drag) return;
  const host = rootRef.value?.parentElement;
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const hit = props.engine.hitTest(e.clientX - rect.left, e.clientY - rect.top);
  if (!hit) {
    if (hoverCell.value) hoverCell.value = null;
    return;
  }
  const ps = props.engine.getPostil(hit.row, hit.col);
  const active = props.engine.getActiveComment();
  if (!ps || ps.isshow || (active && active.row === hit.row && active.col === hit.col)) {
    if (hoverCell.value) hoverCell.value = null;
    return;
  }
  if (hoverCell.value?.row !== hit.row || hoverCell.value?.col !== hit.col) {
    hoverCell.value = { row: hit.row, col: hit.col };
  }
}

function onHostPointerLeave() {
  hoverCell.value = null;
}

function onDocPointerDown(e: PointerEvent) {
  if (!props.engine.getActiveComment()) return;
  const t = e.target as Node | null;
  if (t && rootRef.value?.contains(t)) return;
  deactivate();
}

onMounted(() => {
  off = props.engine.on((ev) => {
    if (
      ev.type === "change" ||
      ev.type === "scroll" ||
      ev.type === "sheet" ||
      ev.type === "comment" ||
      ev.type === "selection"
    ) {
      bump();
      if (ev.type === "comment" && ev.active) focusEditor(ev.active.row, ev.active.col);
    }
  });
  const host = rootRef.value?.parentElement;
  host?.addEventListener("pointermove", onHostPointerMove);
  host?.addEventListener("pointerleave", onHostPointerLeave);
  document.addEventListener("pointerdown", onDocPointerDown, true);
  paintArrows();
});

onUnmounted(() => {
  off?.();
  const host = rootRef.value?.parentElement;
  host?.removeEventListener("pointermove", onHostPointerMove);
  host?.removeEventListener("pointerleave", onHostPointerLeave);
  document.removeEventListener("pointerdown", onDocPointerDown, true);
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragUp);
});

function editorHtml(value: string | null | undefined): string {
  const text = value ?? "";
  return text
    .split("\n")
    .map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
</script>

<template>
  <div ref="rootRef" class="ls3-comments">
    <div
      v-for="item in bubbles"
      :key="keyOf(item.row, item.col) + (item.hover ? '-h' : '')"
      class="ls3-comment"
      :class="{
        'ls3-comment--active': item.active,
        'ls3-comment--hover': item.hover,
      }"
    >
      <canvas
        class="ls3-comment__arrow"
        :data-comment-arrow="keyOf(item.row, item.col)"
        :width="Math.max(1, Math.round(item.arrow.width))"
        :height="Math.max(1, Math.round(item.arrow.height))"
        :style="{ left: `${item.arrow.left}px`, top: `${item.arrow.top}px` }"
      />
      <div
        class="ls3-comment__main"
        :style="{
          left: `${item.left}px`,
          top: `${item.top}px`,
          width: `${item.width}px`,
          height: item.hover ? 'auto' : `${item.height}px`,
          minHeight: item.hover ? `${item.height - 12}px` : undefined,
        }"
        @pointerdown="onBubblePointerDown($event, item)"
      >
        <div v-if="!item.hover" class="ls3-comment__move">
          <div class="ls3-comment__move-item ls3-comment__move-item--t" @pointerdown="onMoveDown($event, item)" />
          <div class="ls3-comment__move-item ls3-comment__move-item--r" @pointerdown="onMoveDown($event, item)" />
          <div class="ls3-comment__move-item ls3-comment__move-item--b" @pointerdown="onMoveDown($event, item)" />
          <div class="ls3-comment__move-item ls3-comment__move-item--l" @pointerdown="onMoveDown($event, item)" />
        </div>
        <div v-if="!item.hover" class="ls3-comment__resize">
          <div class="ls3-comment__resize-item ls3-comment__resize-item--lt" @pointerdown="onResizeDown($event, item, 'lt')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--mt" @pointerdown="onResizeDown($event, item, 'mt')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--rt" @pointerdown="onResizeDown($event, item, 'rt')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--lm" @pointerdown="onResizeDown($event, item, 'lm')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--rm" @pointerdown="onResizeDown($event, item, 'rm')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--lb" @pointerdown="onResizeDown($event, item, 'lb')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--mb" @pointerdown="onResizeDown($event, item, 'mb')" />
          <div class="ls3-comment__resize-item ls3-comment__resize-item--rb" @pointerdown="onResizeDown($event, item, 'rb')" />
        </div>
        <div class="ls3-comment__body">
          <div
            class="ls3-comment__editor"
            :contenteditable="item.active ? 'true' : 'false'"
            :style="{
              width: `${Math.max(12, item.width - 12)}px`,
              height: item.hover ? 'auto' : `${Math.max(12, item.height - 12)}px`,
              minHeight: item.hover ? `${Math.max(12, item.height - 12)}px` : undefined,
            }"
            :ref="(el) => setEditorRef(item.row, item.col, el)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
