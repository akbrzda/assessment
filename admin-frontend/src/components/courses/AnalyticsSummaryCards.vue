<template>
  <div class="summary-grid">
    <article v-for="card in cards" :key="card.title" class="summary-card">
      <div class="card-icon-wrap" :style="{ background: card.iconBg }">
        <component :is="card.icon" :size="22" :color="card.iconColor" />
      </div>
      <div class="card-body">
        <p class="card-label">{{ card.title }}</p>
        <p class="card-value">{{ card.value }}</p>
        <span class="stub">Данные появятся после подключения источника</span>
      </div>
    </article>
  </div>
</template>

<script setup>
import { BarChart2, Clock, AlertTriangle } from "lucide-vue-next";

const cards = [
  {
    title: "Конверсия в завершение",
    value: "50%",
    icon: BarChart2,
    iconBg: "#e6f4fa",
    iconColor: "#0088cc",
  },
  {
    title: "Среднее время прохождения",
    value: "14 мин",
    icon: Clock,
    iconBg: "#e8f8f2",
    iconColor: "#10b981",
  },
  {
    title: "Проблемные темы",
    value: "12%",
    icon: AlertTriangle,
    iconBg: "#fef5e7",
    iconColor: "#f59e0b",
  },
];
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-label {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.card-value {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stub {
  display: inline-flex;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.15);
  color: #475569;
  font-size: 11px;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
