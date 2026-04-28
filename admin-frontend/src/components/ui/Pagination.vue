<template>
  <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-border">
    <div class="text-sm text-muted-foreground">Страница {{ page }} из {{ totalPages }} &bull; Всего {{ total }}</div>
    <div class="flex items-center gap-2">
      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        :disabled="page === 1"
        aria-label="Предыдущая страница"
        @click="updatePage(page - 1)"
      >
        <ChevronLeftIcon :size="15" />
      </button>

      <div class="flex items-center gap-1">
        <button
          v-for="p in visiblePages"
          :key="p"
          :class="[
            'inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-sm transition',
            p === page
              ? 'border-primary bg-primary text-primary-foreground font-semibold'
              : p === '...'
                ? 'border-transparent cursor-default text-muted-foreground'
                : 'border-border bg-card text-foreground hover:bg-accent',
          ]"
          :disabled="p === '...'"
          @click="p !== '...' && updatePage(p)"
        >
          {{ p }}
        </button>
      </div>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        :disabled="page >= totalPages"
        aria-label="Следующая страница"
        @click="updatePage(page + 1)"
      >
        <ChevronRightIcon :size="15" />
      </button>

      <select
        class="h-8 rounded-lg border border-border bg-card text-foreground text-sm px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition"
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

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = props.page;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});

const updatePage = (value) => emit("update:page", Math.min(Math.max(1, value), totalPages.value));
const updateLimit = (value) => {
  const n = Number(value);
  if (!isNaN(n) && n > 0) emit("update:limit", n);
};
</script>
