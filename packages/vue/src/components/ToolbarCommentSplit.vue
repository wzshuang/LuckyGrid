<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ChromeState } from "../composables/useChromeState";
import type { WorkbookEngine } from "@luckygrid/core";

const props = defineProps<{
  engine: WorkbookEngine;
  chrome: ChromeState;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const rootEl = ref<HTMLElement | null>(null);

const hasComment = computed(() => {
  void props.chrome.styleRev.value;
  const focus = props.engine.getFocusCell();
  if (!focus) return false;
  return !!props.engine.getPostil(focus.row, focus.col);
});

type Item = { id: string; label: string };

const items = computed((): Item[] => {
  if (hasComment.value) {
    return [
      { id: "edit", label: "编辑批注" },
      { id: "delete", label: "删除批注" },
      { id: "toggle", label: "显示/隐藏批注" },
      { id: "toggleAll", label: "显示/隐藏所有批注" },
    ];
  }
  return [
    { id: "new", label: "新建批注" },
    { id: "toggleAll", label: "显示/隐藏所有批注" },
  ];
});

function toggleMenu() {
  emit("update:open", !props.open);
}

function onPick(id: string) {
  emit("update:open", false);
  switch (id) {
    case "new":
      props.engine.newComment();
      break;
    case "edit":
      props.engine.editComment();
      break;
    case "delete":
      props.engine.deleteComment();
      break;
    case "toggle":
      props.engine.showHideComment();
      break;
    case "toggleAll":
      props.engine.showHideAllComments();
      break;
  }
}

function onDocPointer(e: PointerEvent) {
  if (!props.open) return;
  const t = e.target as Node | null;
  if (t && rootEl.value?.contains(t)) return;
  emit("update:open", false);
}

onMounted(() => document.addEventListener("pointerdown", onDocPointer));
onUnmounted(() => document.removeEventListener("pointerdown", onDocPointer));
</script>

<template>
  <div ref="rootEl" class="ls3-toolbar__split ls3-toolbar__split--align">
    <button type="button" class="ls3-toolbar__split-left" title="批注" @click="toggleMenu">
      <i class="iconfont-luckysheet luckysheet-iconfont-zhushi ls3-toolbar__icon" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="ls3-toolbar__split-right"
      title="批注"
      :aria-expanded="open"
      @click="toggleMenu"
    >
      <i class="iconfont-luckysheet luckysheet-iconfont-xiayige" aria-hidden="true" />
    </button>
    <ul v-if="open" class="ls3-toolbar__menu" role="menu">
      <li v-for="item in items" :key="item.id" role="none">
        <button type="button" class="ls3-toolbar__menu-item" role="menuitem" @click="onPick(item.id)">
          <span class="ls3-toolbar__menu-label">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
