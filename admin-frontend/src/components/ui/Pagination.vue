<template>
  <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-border">
    <div class="text-sm text-muted-foreground">Страница {{ page }} из {{ totalPages }} • Всего {{ total }}</div>
    <div class="flex items-center gap-3">
      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background text-foreground text-lg cursor-pointer transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="page === 1"
        aria-label="Предыдущая страница"
        @click="updatePage(page - 1)"
      >
        ‹
      </button>
      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background text-foreground text-lg cursor-pointer transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="page >= totalPages"
        aria-label="Следующая страница"
        @click="updatePage(page + 1)"
      >
        ›
      </button>
      <select
        class="border border-border rounded-lg bg-background text-foreground text-sm px-3 py-2 cursor-pointer focus:outline-none focus:border-accent-blue"
        :value="limit"
        @change="updateLimit($event.target.value)"
      >
        <option v-for="option in limitOptions" :key="option" :value="option">{{ option }} на странице</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  total: {
    type: Number,
    default: 0,
  },
  page: {
    type: Number,
    default: 1,
  },
  limit: {
    type: Number,
    default: 20,
  },
  limitOptions: {
    type: Array,
    default: () => [10, 20, 50, 100],
  },
});

const emit = defineEmits(["update:page", "update:limit"]);

const totalPages = computed(() => {
  if (!props.limit || props.limit <= 0) return 1;
  return Math.max(1, Math.ceil(props.total / props.limit));
});

const updatePage = (value) => {
  const nextPage = Math.min(Math.max(1, value), totalPages.value);
  emit("update:page", nextPage);
};

const updateLimit = (value) => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    emit("update:limit", numeric);
  }
};
</script>
