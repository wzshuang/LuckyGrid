<script setup lang="ts">
import { computed, ref } from "vue";
import { demoGroups, demoById } from "./demos";
import DemoPanel from "./components/DemoPanel.vue";

const selectedId = ref(demoGroups[0]?.demos[0]?.id ?? "basic-grid");

const currentDemo = computed(() => demoById(selectedId.value));

function select(id: string) {
  selectedId.value = id;
}
</script>

<template>
  <div class="site">
    <header class="site__top">
      <strong>LuckyGrid</strong>
      <span class="site__tag">在线 Demo</span>
    </header>
    <div class="site__body">
      <aside class="nav">
        <div v-for="group in demoGroups" :key="group.title" class="nav__group">
          <div class="nav__title">{{ group.title }}</div>
          <button
            v-for="item in group.demos"
            :key="item.id"
            type="button"
            class="nav__item"
            :class="{ 'is-active': item.id === selectedId }"
            @click="select(item.id)"
          >
            {{ item.title }}
          </button>
        </div>
      </aside>
      <main class="main">
        <DemoPanel v-if="currentDemo" :key="currentDemo.id" :demo="currentDemo" />
      </main>
    </div>
  </div>
</template>

<style>
html,
body,
#app {
  margin: 0;
  height: 100%;
}
</style>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #111;
}
.site__top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #111;
  color: #fff;
}
.site__tag {
  font-size: 0.75rem;
  color: #9ecbff;
}
.site__body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.nav {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  background: #fafafa;
  overflow-y: auto;
  padding: 12px 0;
}
.nav__group {
  margin-bottom: 16px;
}
.nav__title {
  padding: 4px 16px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #888;
}
.nav__item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #333;
}
.nav__item:hover {
  background: #eee;
}
.nav__item.is-active {
  background: #e8f0fe;
  color: #1a56db;
  font-weight: 600;
}
.main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
