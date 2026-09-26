<script setup lang="ts">
import { onUnmounted, ref, shallowRef, watch } from "vue";
import { LuckyGrid } from "@luckygrid/vue";
import luckygrid from "@luckygrid/compat";
import type { LuckyGridRaw } from "@luckygrid/core";
import type { DemoDefinition } from "../types";
import { runDemoCode } from "../lib/runDemoCode";
import "@luckygrid/vue/style.css";

const props = defineProps<{
  demo: DemoDefinition;
}>();

const code = ref(props.demo.initialCode);
const error = ref("");
const lastOp = ref<string>("");

const componentPayload = shallowRef<{
  data: LuckyGridRaw[];
  lang: string;
  showOpLog: boolean;
} | null>(null);

const compatHostId = ref<string | null>(null);
const compatKey = ref(0);

function apply() {
  error.value = "";
  lastOp.value = "";
  teardownCompat();

  const out = runDemoCode(code.value);
  if (!out.ok) {
    error.value = out.error;
    componentPayload.value = null;
    compatHostId.value = null;
    return;
  }

  if (out.result.kind === "component") {
    compatHostId.value = null;
    componentPayload.value = {
      data: out.result.data as LuckyGridRaw[],
      lang: out.result.lang ?? "zh",
      showOpLog: Boolean(out.result.showOpLog),
    };
    return;
  }

  componentPayload.value = null;
  compatHostId.value = out.result.containerId;
  compatKey.value += 1;
  queueMicrotask(() => {
    luckygrid.create({
      container: out.result.containerId,
      data: out.result.data as LuckyGridRaw[],
    });
  });
}

function teardownCompat() {
  if (compatHostId.value) {
    luckygrid.destroy(compatHostId.value);
  }
}

function onOp(op: unknown) {
  lastOp.value = JSON.stringify(op, null, 2);
}

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(code, () => {
  clearTimeout(debounce);
  debounce = setTimeout(apply, 400);
});

watch(
  () => props.demo.id,
  () => {
    code.value = props.demo.initialCode;
    apply();
  },
  { immediate: true },
);

onUnmounted(() => {
  clearTimeout(debounce);
  teardownCompat();
});
</script>

<template>
  <div class="panel">
    <header class="panel__head">
      <div>
        <h2>{{ demo.title }}</h2>
        <p>{{ demo.description }}</p>
      </div>
      <button type="button" class="panel__run" @click="apply">立即运行</button>
    </header>

    <section class="panel__preview">
      <p v-if="error" class="panel__error">{{ error }}</p>
      <p v-if="componentPayload?.showOpLog && lastOp" class="panel__op">
        <strong>last op:</strong>
        <pre>{{ lastOp }}</pre>
      </p>
      <div v-if="componentPayload" class="panel__grid">
        <LuckyGrid
          :key="JSON.stringify(componentPayload.data)"
          :data="componentPayload.data"
          :lang="componentPayload.lang"
          @op="onOp"
        />
      </div>
      <div
        v-else-if="compatHostId"
        :key="compatKey"
        :id="compatHostId"
        class="panel__grid panel__compat-host"
      />
    </section>

    <section class="panel__code">
      <div class="panel__code-label">
        代码（修改后约 400ms 自动运行，或点「立即运行」）
      </div>
      <textarea
        v-model="code"
        class="panel__textarea"
        spellcheck="false"
        @keydown.ctrl.enter.prevent="apply"
        @keydown.meta.enter.prevent="apply"
      />
    </section>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
}
.panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}
.panel__head h2 {
  margin: 0 0 4px;
  font-size: 1.125rem;
}
.panel__head p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}
.panel__run {
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f5f5f5;
  cursor: pointer;
  white-space: nowrap;
}
.panel__run:hover {
  background: #ebebeb;
}
.panel__preview {
  flex: 1;
  min-height: 240px;
  max-height: 45vh;
  display: flex;
  flex-direction: column;
  padding: 12px 20px;
  border-bottom: 1px solid #eee;
  overflow: auto;
}
.panel__error {
  color: #b00020;
  margin: 0 0 8px;
  font-size: 0.875rem;
}
.panel__op {
  margin: 0 0 8px;
  font-size: 0.75rem;
}
.panel__op pre {
  margin: 4px 0 0;
  padding: 8px;
  background: #f6f8fa;
  border-radius: 4px;
  max-height: 80px;
  overflow: auto;
}
.panel__grid {
  flex: 1;
  min-height: 200px;
}
.panel__compat-host {
  min-height: 280px;
}
.panel__code {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  padding: 12px 20px 20px;
}
.panel__code-label {
  font-size: 0.8125rem;
  color: #666;
  margin-bottom: 8px;
}
.panel__textarea {
  flex: 1;
  min-height: 180px;
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.45;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  tab-size: 2;
}
</style>
