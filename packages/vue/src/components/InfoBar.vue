<script setup lang="ts">
import { computed, ref, watch } from "vue";

export type InfoBarUserInfo =
  | false
  | true
  | string
  | { userImage: string; userName: string };

const props = withDefaults(
  defineProps<{
    title?: string;
    lang?: string;
    myFolderUrl?: string;
    userInfo?: InfoBarUserInfo;
    functionButton?: string;
  }>(),
  {
    title: "Luckysheet Demo",
    lang: "zh",
    userInfo: false,
    functionButton: "",
  },
);

const emit = defineEmits<{
  "update:title": [value: string];
}>();

const INFO_I18N = {
  zh: {
    return: "返回",
    tips: "表格重命名",
    rename: "重命名",
    noName: "无标题的电子表格",
    detailUpdate: "新打开",
    wait: "待更新",
  },
  en: {
    return: "Exit",
    tips: "WorkBook rename",
    rename: "Rename",
    noName: "Untitled spreadsheet",
    detailUpdate: "New opened",
    wait: "waiting for update",
  },
} as const;

const i18n = computed(() =>
  props.lang?.startsWith("en") ? INFO_I18N.en : INFO_I18N.zh,
);

const draft = ref(props.title);
const inputWidth = ref(measureWidth(props.title));

watch(
  () => props.title,
  (v) => {
    draft.value = v;
    inputWidth.value = measureWidth(v);
  },
);

function getByteLen(val: string): number {
  let len = 0;
  for (const ch of val) {
    len += ch.charCodeAt(0) > 255 ? 2 : 1;
  }
  return len;
}

function measureWidth(val: string): number {
  return Math.max(getByteLen(val) * 10, 40);
}

function onInput() {
  inputWidth.value = measureWidth(draft.value);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    (e.target as HTMLInputElement).blur();
  }
}

function onChange() {
  const next = draft.value.trim() || i18n.value.noName;
  draft.value = next;
  inputWidth.value = measureWidth(next);
  if (next !== props.title) {
    emit("update:title", next);
  }
}

function onBack() {
  const url = props.myFolderUrl?.trim();
  if (!url) return;
  window.open(url, "_self");
}

const showUser = computed(() => props.userInfo !== false && props.userInfo != null);

const userIsString = computed(
  () => typeof props.userInfo === "string" || props.userInfo === true,
);

const userStringHtml = computed(() => {
  if (props.userInfo === true) {
    return '<i style="font-size:16px;color:#ff6a00;" class="fa fa-taxi" aria-hidden="true"></i> Lucky';
  }
  return typeof props.userInfo === "string" ? props.userInfo : "";
});

const userObject = computed(() => {
  if (props.userInfo && typeof props.userInfo === "object") {
    return props.userInfo;
  }
  return null;
});
</script>

<template>
  <div class="ls3-infobar">
    <div
      class="ls3-infobar__back"
      :title="i18n.return"
      role="button"
      tabindex="0"
      @click="onBack"
      @keydown.enter.prevent="onBack"
    >
      <svg
        class="ls3-infobar__back-icon"
        viewBox="0 0 14 22"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M11.5 2.5L4 11l7.5 8.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <div class="ls3-infobar__logo" :title="draft" />

    <div class="ls3-infobar__sheet-name">
      <input
        class="ls3-infobar__input"
        type="text"
        :value="draft"
        :style="{ width: `${inputWidth}px` }"
        :title="i18n.tips"
        :aria-label="i18n.rename"
        @input="draft = ($event.target as HTMLInputElement).value; onInput()"
        @keydown="onKeydown"
        @change="onChange"
      />
    </div>

    <div class="ls3-infobar__update">{{ i18n.detailUpdate }}</div>
    <div class="ls3-infobar__save">{{ i18n.wait }}</div>

    <div v-if="functionButton" class="ls3-infobar__extra" v-html="functionButton" />
    <div v-else-if="$slots.default" class="ls3-infobar__extra">
      <slot />
    </div>

    <div v-if="showUser" class="ls3-infobar__user">
      <template v-if="userObject">
        <img
          class="ls3-infobar__user-img"
          :src="userObject.userImage"
          alt=""
        />
        <span>{{ userObject.userName }}</span>
      </template>
      <span v-else-if="userIsString" v-html="userStringHtml" />
    </div>
  </div>
</template>
