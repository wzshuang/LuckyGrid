<script setup lang="ts">
/** 与 Luckysheet menuButton.focus：`span.icon` 内 `<i class="fa fa-check">` */
defineProps<{
  on?: boolean;
}>();
</script>

<template>
  <span class="ls3-toolbar__menu-check" aria-hidden="true">
    <i v-if="on" class="ls3-toolbar__menu-check-fa" />
  </span>
</template>
