<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import luckygrid, { luckysheet } from "@luckygrid/compat";
import sheetMini from "../../../../fixtures/lucky/sheet-mini.json";

const log = ref("");

onMounted(() => {
  luckygrid.create({
    container: "luckygrid-compat",
    data: [sheetMini as never],
    onOp: (op) => {
      console.log("op", op);
    },
  });
});

onUnmounted(() => {
  luckygrid.destroy("luckygrid-compat");
});

function read() {
  log.value = String(luckygrid.getCellValue(0, 0));
}

function write() {
  luckygrid.setCellValue(0, 0, 99);
  read();
}

function readLegacy() {
  log.value = String(luckysheet.getCellValue(0, 0));
}
</script>

<template>
  <div class="compat">
    <p>
      推荐 <code>luckygrid.create / getCellValue / setCellValue</code>；<code>luckysheet.*</code>
      为同一 API 的别名（非完整原版 API）。
    </p>
    <div class="compat__actions">
      <button type="button" @click="read">luckygrid.getCellValue(0,0)</button>
      <button type="button" @click="readLegacy">luckysheet.getCellValue(0,0)</button>
      <button type="button" @click="write">setCellValue(0,0,99)</button>
      <span>{{ log }}</span>
    </div>
    <div id="luckygrid-compat" class="compat__host" />
  </div>
</template>

<style scoped>
.compat {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
}
.compat__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.compat__host {
  flex: 1;
  min-height: 400px;
}
</style>
