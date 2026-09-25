<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  BORDER_MENU_LINE_CANVAS_H,
  BORDER_MENU_LINE_CANVAS_W,
  drawBorderMenuLinePreview,
} from "../utils/draw-border-menu-line-preview";

const props = withDefaults(
  defineProps<{
    /** Lucky style 1–13; null/0 clears (「无」) */
    styleValue: number | null;
    width?: number;
    height?: number;
  }>(),
  {
    width: BORDER_MENU_LINE_CANVAS_W,
    height: BORDER_MENU_LINE_CANVAS_H,
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);

function paint() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = props.width;
  const h = props.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (props.styleValue == null || props.styleValue === 0) return;
  drawBorderMenuLinePreview(ctx, props.styleValue, w, h);
}

onMounted(paint);
watch(() => [props.styleValue, props.width, props.height] as const, paint);
</script>

<template>
  <canvas
    ref="canvasRef"
    class="ls3-toolbar__line-preview-canvas"
    :width="width"
    :height="height"
    aria-hidden="true"
  />
</template>
