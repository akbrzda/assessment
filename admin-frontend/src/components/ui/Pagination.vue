<template>
  <div class="pagination">
    <div class="pagination-info">
      Страница {{ page }} из {{ totalPages }} • Всего {{ total }}
    </div>
    <div class="pagination-controls">
      <button class="pagination-btn" :disabled="page === 1" @click="updatePage(page - 1)" aria-label="Предыдущая страница">
        ‹
      </button>
      <button class="pagination-btn" :disabled="page >= totalPages" @click="updatePage(page + 1)" aria-label="Следующая страница">
        ›
      </button>
      <select class="pagination-select" :value="limit" @change="updateLimit($event.target.value)">
        <option v-for="option in limitOptions" :key="option" :value="option">
          {{ option }} на странице
        </option>
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

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--divider);
}

.pagination-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--divider);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 18px;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-select {
  border: 1px solid var(--divider);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 6px 10px;
  font-size: 14px;
}
</style>
