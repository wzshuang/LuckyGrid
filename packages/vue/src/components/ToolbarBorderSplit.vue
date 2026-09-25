<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { WorkbookEngine } from "@luckysheet3/core";
import ToolbarMenuCheck from "./ToolbarMenuCheck.vue";
import ToolbarBorderLinePreview from "./ToolbarBorderLinePreview.vue";
import {
  BORDER_MENU_SIZE_PREVIEW_H,
  BORDER_MENU_SIZE_PREVIEW_W,
} from "../utils/draw-border-menu-line-preview";

type BorderType =
  | "border-top"
  | "border-bottom"
  | "border-left"
  | "border-right"
  | "border-none"
  | "border-all"
  | "border-outside"
  | "border-inside"
  | "border-horizontal"
  | "border-vertical";

/** 子菜单项：0 = 无（与原版 borderSize itemvalue null，应用时回退 style 1） */
const BORDER_LINE_STYLE_MENU: ReadonlyArray<{ value: number; key: string; label?: string }> = [
  { value: 0, key: "none", label: "无" },
  { value: 1, key: "Thin" },
  { value: 2, key: "Hair" },
  { value: 3, key: "Dotted" },
  { value: 4, key: "DashDot" },
  { value: 5, key: "DashDotDot" },
  { value: 6, key: "SlantDashDot" },
  { value: 7, key: "Double" },
  { value: 8, key: "Medium" },
  { value: 9, key: "MediumDashed" },
  { value: 10, key: "MediumDashDot" },
  { value: 11, key: "MediumDashDotDot" },
  { value: 12, key: "SlantDashDot" },
  { value: 13, key: "Thick" },
];

const BORDER_ICONS: Record<BorderType, string> = {
  "border-top": "shangbiankuang",
  "border-bottom": "xiabiankuang",
  "border-left": "zuobiankuang",
  "border-right": "youbiankuang",
  "border-none": "wubiankuang",
  "border-all": "quanjiabiankuang",
  "border-outside": "sizhoujiabiankuang",
  "border-inside": "neikuangxian",
  "border-horizontal": "neikuanghengxian",
  "border-vertical": "neikuangshuxian",
};

type MenuItem = { kind: "item"; type: BorderType; title: string } | { kind: "sep" };

/** 文案与 Luckysheet `src/locale/zh.js` → `border` 一致 */
const MENU: MenuItem[] = [
  { kind: "item", type: "border-top", title: "上框线" },
  { kind: "item", type: "border-bottom", title: "下框线" },
  { kind: "item", type: "border-left", title: "左框线" },
  { kind: "item", type: "border-right", title: "右框线" },
  { kind: "sep" },
  { kind: "item", type: "border-none", title: "无" },
  { kind: "item", type: "border-all", title: "所有" },
  { kind: "item", type: "border-outside", title: "外侧" },
  { kind: "sep" },
  { kind: "item", type: "border-inside", title: "内侧" },
  { kind: "item", type: "border-horizontal", title: "内侧横线" },
  { kind: "item", type: "border-vertical", title: "内侧竖线" },
  { kind: "sep" },
];

const props = defineProps<{
  engine: WorkbookEngine;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const rootEl = ref<HTMLElement | null>(null);
const lastBorderType = ref<BorderType>("border-all");
const borderColor = ref("#000000");
const borderLineStyle = ref<number | null>(null);

function borderStyleForApply(): number {
  return borderLineStyle.value ?? 1;
}

function isBorderLineStyleSelected(value: number): boolean {
  if (value === 0) return borderLineStyle.value === null;
  return borderLineStyle.value === value;
}
const SUB_PANEL_HIDE_MS = 200;
type SubPanel = "color" | "style";
const openSubPanel = ref<SubPanel | null>(null);
let subPanelHideTimer: ReturnType<typeof setTimeout> | undefined;

function clearSubPanelHideTimer() {
  if (subPanelHideTimer !== undefined) {
    clearTimeout(subPanelHideTimer);
    subPanelHideTimer = undefined;
  }
}

function showSubPanel(panel: SubPanel) {
  clearSubPanelHideTimer();
  openSubPanel.value = panel;
}

function scheduleHideSubPanel(panel: SubPanel) {
  clearSubPanelHideTimer();
  subPanelHideTimer = setTimeout(() => {
    if (openSubPanel.value === panel) openSubPanel.value = null;
    subPanelHideTimer = undefined;
  }, SUB_PANEL_HIDE_MS);
}

function closeSubPanels() {
  clearSubPanelHideTimer();
  openSubPanel.value = null;
}

const leftIcon = computed(() => BORDER_ICONS[lastBorderType.value]);
const leftTitle = computed(() => "边框");

function apply(type: BorderType) {
  props.engine.applyBordersToSelection(type, borderColor.value, borderStyleForApply());
}

function onLeft() {
  apply(lastBorderType.value);
  emit("update:open", false);
  closeSubPanels();
}

function toggleMenu() {
  emit("update:open", !props.open);
  if (!props.open) closeSubPanels();
}

function onPickType(type: BorderType) {
  lastBorderType.value = type;
  apply(type);
  emit("update:open", false);
  closeSubPanels();
}

function onBorderColor(e: Event) {
  borderColor.value = (e.target as HTMLInputElement).value;
}

function resetBorderColor() {
  borderColor.value = "#000000";
}

function onPickStyle(value: number) {
  borderLineStyle.value = value === 0 ? null : value;
  closeSubPanels();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) {
    emit("update:open", false);
    closeSubPanels();
  }
}

function onDocPointer(e: Event) {
  if (!props.open) return;
  const target = e.target;
  if (target instanceof Node && rootEl.value?.contains(target)) return;
  emit("update:open", false);
  closeSubPanels();
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onDocPointer);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("pointerdown", onDocPointer);
  clearSubPanelHideTimer();
});
</script>

<template>
  <div ref="rootEl" class="ls3-toolbar__split ls3-toolbar__split--align ls3-toolbar__split--border">
    <button type="button" class="ls3-toolbar__split-left" :title="leftTitle" @click="onLeft">
      <i
        class="iconfont-luckysheet ls3-toolbar__icon"
        :class="`luckysheet-iconfont-${leftIcon}`"
        aria-hidden="true"
      />
    </button>
    <button
      type="button"
      class="ls3-toolbar__split-right"
      title="边框类型"
      :aria-expanded="open"
      @click="toggleMenu"
    >
      <i class="iconfont-luckysheet luckysheet-iconfont-xiayige" aria-hidden="true" />
    </button>
    <ul v-if="open" class="ls3-toolbar__menu ls3-toolbar__menu--border" role="menu">
      <template v-for="(entry, idx) in MENU" :key="idx">
        <li v-if="entry.kind === 'sep'" class="ls3-toolbar__menu-sep" role="separator" />
        <li v-else role="none">
          <button
            type="button"
            class="ls3-toolbar__menu-item ls3-toolbar__menu-item--border-row"
            role="menuitem"
            :title="entry.title"
            @click="onPickType(entry.type)"
          >
            <ToolbarMenuCheck :on="entry.type === lastBorderType" />
            <span class="ls3-toolbar__menu-label">{{ entry.title }}</span>
            <i
              class="iconfont-luckysheet ls3-toolbar__menu-icon ls3-toolbar__menu-icon--border"
              :class="`luckysheet-iconfont-${BORDER_ICONS[entry.type]}`"
              aria-hidden="true"
            />
          </button>
        </li>
      </template>
      <li
        role="none"
        class="ls3-toolbar__menu-item-wrap"
        @mouseenter="showSubPanel('color')"
        @mouseleave="scheduleHideSubPanel('color')"
      >
        <button
          type="button"
          class="ls3-toolbar__menu-item ls3-toolbar__menu-item--border-row ls3-toolbar__menu-item--color ls3-toolbar__menu-item--has-sub"
          :class="{ 'ls3-toolbar__menu-item--sub-open': openSubPanel === 'color' }"
          role="menuitem"
          title="边框颜色"
        >
          <ToolbarMenuCheck />
          <span
            class="ls3-toolbar__menu-label ls3-toolbar__menu-label--color"
            :style="{ borderBottom: `3px solid ${borderColor}` }"
          >
            边框颜色
          </span>
          <i
            class="iconfont-luckysheet ls3-toolbar__menu-submenu-arrow luckysheet-iconfont-youjiantou"
            aria-hidden="true"
          />
        </button>
        <div
          v-if="openSubPanel === 'color'"
          class="ls3-toolbar__menu ls3-toolbar__menu--sub ls3-toolbar__menu--sub-color"
          role="menu"
          @mouseenter="showSubPanel('color')"
          @mouseleave="scheduleHideSubPanel('color')"
        >
          <button
            type="button"
            class="ls3-toolbar__menu-item ls3-toolbar__menu-item--border-row ls3-toolbar__border-color-reset"
            role="menuitem"
            @click="resetBorderColor"
          >
            重置颜色
          </button>
          <label class="ls3-toolbar__border-color-picker">
            <input type="color" :value="borderColor" @input="onBorderColor" />
          </label>
        </div>
      </li>
      <li
        class="ls3-toolbar__menu-item-wrap"
        role="none"
        @mouseenter="showSubPanel('style')"
        @mouseleave="scheduleHideSubPanel('style')"
      >
        <button
          type="button"
          class="ls3-toolbar__menu-item ls3-toolbar__menu-item--border-row ls3-toolbar__menu-item--border-size ls3-toolbar__menu-item--has-sub"
          :class="{ 'ls3-toolbar__menu-item--sub-open': openSubPanel === 'style' }"
          role="menuitem"
          title="边框粗细"
          :aria-expanded="openSubPanel === 'style'"
        >
          <ToolbarMenuCheck />
          <span class="ls3-toolbar__menu-label ls3-toolbar__menu-label--border-size">
            边框粗细
            <ToolbarBorderLinePreview
              class="ls3-toolbar__border-size-preview"
              :style-value="borderLineStyle"
              :width="BORDER_MENU_SIZE_PREVIEW_W"
              :height="BORDER_MENU_SIZE_PREVIEW_H"
            />
          </span>
          <i
            class="iconfont-luckysheet ls3-toolbar__menu-submenu-arrow luckysheet-iconfont-youjiantou"
            aria-hidden="true"
          />
        </button>
        <ul
          v-if="openSubPanel === 'style'"
          class="ls3-toolbar__menu ls3-toolbar__menu--sub"
          role="menu"
          @mouseenter="showSubPanel('style')"
          @mouseleave="scheduleHideSubPanel('style')"
        >
          <li v-for="line in BORDER_LINE_STYLE_MENU" :key="line.value" role="none">
            <button
              type="button"
              class="ls3-toolbar__menu-item ls3-toolbar__menu-item--border-row ls3-toolbar__menu-item--line"
              :class="{ 'ls3-toolbar__menu-item--line-none': line.value === 0 }"
              role="menuitem"
              :title="line.label ?? line.key"
              @click="onPickStyle(line.value)"
            >
              <ToolbarMenuCheck :on="isBorderLineStyleSelected(line.value)" />
              <span v-if="line.value === 0" class="ls3-toolbar__menu-label">{{ line.label }}</span>
              <ToolbarBorderLinePreview v-else :style-value="line.value" />
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
