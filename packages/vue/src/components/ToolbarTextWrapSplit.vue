<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ChromeState } from "../composables/useChromeState";
import type { WorkbookEngine } from "@luckysheet3/core";
import ToolbarMenuCheck from "./ToolbarMenuCheck.vue";

type WrapItem = {
  icon: string;
  title: string;
  value: number;
};

const DEFAULT_TB = 0;

const ITEMS: WrapItem[] = [
  { icon: "yichu1", title: "溢出", value: 1 },
  { icon: "zidonghuanhang", title: "自动换行", value: 2 },
  { icon: "jieduan", title: "截断", value: 0 },
];

const props = defineProps<{
  engine: WorkbookEngine;
  chrome: ChromeState;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const rootEl = ref<HTMLElement | null>(null);

const currentValue = computed(() => {
  void props.chrome.styleRev.value;
  const cell = props.engine.getActiveCellStyle();
  const tb = cell?.tb;
  return tb === 0 || tb === 1 || tb === 2 ? tb : DEFAULT_TB;
});

const currentItem = computed(() => {
  const found = ITEMS.find((item) => item.value === currentValue.value);
  if (found) return found;
  return ITEMS.find((item) => item.value === DEFAULT_TB) ?? ITEMS[0]!;
});

function apply(value: number) {
  props.engine.applyStyleToSelection({ tb: value });
}

function onLeft() {
  apply(currentValue.value);
  emit("update:open", false);
}

function toggleMenu() {
  emit("update:open", !props.open);
}

function onPick(value: number) {
  apply(value);
  emit("update:open", false);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) emit("update:open", false);
}

function onDocPointer(e: Event) {
  if (!props.open) return;
  const target = e.target;
  if (target instanceof Node && rootEl.value?.contains(target)) return;
  emit("update:open", false);
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onDocPointer);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("pointerdown", onDocPointer);
});
</script>

<template>
  <div ref="rootEl" class="ls3-toolbar__split ls3-toolbar__split--align">
    <button type="button" class="ls3-toolbar__split-left" title="文本换行" @click="onLeft">
      <i
        class="iconfont-luckysheet ls3-toolbar__icon"
        :class="`luckysheet-iconfont-${currentItem.icon}`"
        aria-hidden="true"
      />
    </button>
    <button
      type="button"
      class="ls3-toolbar__split-right"
      title="文本换行"
      :aria-expanded="open"
      @click="toggleMenu"
    >
      <i class="iconfont-luckysheet luckysheet-iconfont-xiayige" aria-hidden="true" />
    </button>
    <ul v-if="open" class="ls3-toolbar__menu" role="menu">
      <li v-for="item in ITEMS" :key="item.icon" role="none">
        <button
          type="button"
          class="ls3-toolbar__menu-item"
          role="menuitem"
          :title="item.title"
          @click="onPick(item.value)"
        >
          <ToolbarMenuCheck :on="item.value === currentValue" />
          <span class="ls3-toolbar__menu-label">{{ item.title }}</span>
          <i
            class="iconfont-luckysheet ls3-toolbar__menu-icon"
            :class="`luckysheet-iconfont-${item.icon}`"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
