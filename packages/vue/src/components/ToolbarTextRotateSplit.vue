<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ChromeState } from "../composables/useChromeState";
import type { WorkbookEngine } from "@luckysheet3/core";
import ToolbarMenuCheck from "./ToolbarMenuCheck.vue";

type RotateItem = {
  icon: string;
  title: string;
  value: number;
};

const DEFAULT_TR = 0;

const ITEMS: RotateItem[] = [
  { icon: "wuxuanzhuang", title: "无旋转", value: 0 },
  { icon: "xiangshangqingxie", title: "向上倾斜", value: 1 },
  { icon: "xiangxiaqingxie", title: "向下倾斜", value: 2 },
  { icon: "shupaiwenzi", title: "竖排文字", value: 3 },
  { icon: "wenbenxiangshang", title: "向上90°", value: 4 },
  { icon: "xiangxia90", title: "向下90°", value: 5 },
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
  const tr = cell?.tr;
  return tr === 0 || tr === 1 || tr === 2 || tr === 3 || tr === 4 || tr === 5 ? tr : DEFAULT_TR;
});

const currentItem = computed(() => {
  const found = ITEMS.find((item) => item.value === currentValue.value);
  if (found) return found;
  return ITEMS.find((item) => item.value === DEFAULT_TR) ?? ITEMS[0]!;
});

function apply(value: number) {
  props.engine.applyStyleToSelection({ tr: value });
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
    <button type="button" class="ls3-toolbar__split-left" title="文本旋转" @click="onLeft">
      <i
        class="iconfont-luckysheet ls3-toolbar__icon"
        :class="`luckysheet-iconfont-${currentItem.icon}`"
        aria-hidden="true"
      />
    </button>
    <button
      type="button"
      class="ls3-toolbar__split-right"
      title="文本旋转"
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
