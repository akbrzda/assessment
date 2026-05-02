<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
    <div class="text-sm text-muted-foreground">Страница {{ page }} из {{ totalPages }} • Всего {{ total }}</div>
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        :disabled="page === 1"
        aria-label="Предыдущая страница"
        @click="updatePage(page - 1)"
      >
        <ChevronLeftIcon :size="15" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        :disabled="page >= totalPages"
        aria-label="Следующая страница"
        @click="updatePage(page + 1)"
      >
        <ChevronRightIcon :size="15" />
      </button>

      <select
        class="h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-sm text-foreground transition focus:outline-none focus-visible:shadow-[var(--focus-ring)]"
        :value="limit"
        @change="updateLimit($event.target.value)"
      >
        <option v-for="option in limitOptions" :key="option" :value="option">{{ option }} / стр.</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from "lucide-vue-next";

const props = defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 20 },
  limitOptions: { type: Array, default: () => [10, 20, 50, 100] },
});

const emit = defineEmits(["update:page", "update:limit"]);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / (props.limit || 20))));

const updatePage = (value) => emit("update:page", Math.min(Math.max(1, value), totalPages.value));
const updateLimit = (value) => {
  const n = Number(value);
  if (!isNaN(n) && n > 0) emit("update:limit", n);
};
</script>
