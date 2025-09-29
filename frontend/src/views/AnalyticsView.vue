<template>
  <PageContainer title="Аналитика" subtitle="Статистика и отчёты">
    <LoadingState v-if="isInitialLoading" message="Готовим отчёт" />
    <template v-else>
      <section class="filters">
        <div class="filters__row">
          <BaseSelect v-model.number="selectedBranch" class="filters__control">
            <option value="">Все филиалы</option>
            <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">
              {{ branch.name }}
            </option>
          </BaseSelect>
          <BaseSelect v-model.number="selectedPosition" class="filters__control">
            <option value="">Все должности</option>
            <option v-for="position in positionOptions" :key="position.id" :value="position.id">
              {{ position.name }}
            </option>
          </BaseSelect>
        </div>
        <div class="filters__row">
          <input v-model="dateFrom" type="date" class="filters__date" />
          <input v-model="dateTo" type="date" class="filters__date" />
          <button class="secondary-button" type="button" @click="resetFilters">Сбросить</button>
          <button class="primary-button" type="button" :disabled="isExporting" @click="exportData">
            {{ isExporting ? "Экспорт..." : "Экспорт Excel" }}
          </button>
        </div>
      </section>

      <p v-if="analyticsStore.error" class="error">{{ analyticsStore.error }}</p>

      <InfoCard title="Ключевые показатели" v-if="summary">
        <div class="summary-grid">
          <div class="summary-card">
            <span class="summary-card__label">Назначено аттестаций</span>
            <strong class="summary-card__value">{{ summary.totalAssessments }}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-card__label">Активных сейчас</span>
            <strong class="summary-card__value">{{ summary.activeAssessments }}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-card__label">Прохождений</span>
            <strong class="summary-card__value">{{ summary.completedAttempts }}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-card__label">Процент успешных</span>
            <strong class="summary-card__value">{{ formatPercent(summary.passRate) }}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-card__label">Средний результат</span>
            <strong class="summary-card__value">{{ formatPercent(summary.averageScore) }}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-card__label">Среднее время</span>
            <strong class="summary-card__value">{{ formatDuration(summary.averageTimeSeconds) }}</strong>
          </div>
          <div class="summary-card">
            <span class="summary-card__label">Назначено сотрудникам</span>
            <strong class="summary-card__value">{{ summary.assignedUsers }}</strong>
          </div>
        </div>
      </InfoCard>

      <InfoCard title="Филиалы" v-if="branchRows.length">
        <ul class="branch-list">
          <li v-for="branch in branchRows" :key="branch.branchId || branch.branchName" class="branch-item">
            <div class="branch-item__header">
              <span class="branch-item__name">{{ branch.branchName }}</span>
              <span class="branch-item__value">{{ branch.attempts }} попыток</span>
            </div>
            <div class="branch-item__bar">
              <div class="branch-item__bar-inner" :style="{ width: branchBarWidth(branch) }" />
            </div>
            <div class="branch-item__meta">
              <span>Аттестаций: {{ branch.assessments }}</span>
              <span>Участников: {{ branch.participants }}</span>
              <span>Средний %: {{ formatPercent(branch.averageScore) }}</span>
              <span>Успех: {{ formatPercent(branch.passRate) }}</span>
            </div>
          </li>
        </ul>
      </InfoCard>
      <InfoCard v-else title="Филиалы">
        <p class="hint">Нет данных по выбранным фильтрам.</p>
      </InfoCard>

      <InfoCard title="Лучшие сотрудники">
        <div class="employee-controls">
          <button
            v-for="option in sortOptions"
            :key="option.value"
            type="button"
            class="chip"
            :class="{ 'chip--active': analyticsStore.sortBy === option.value }"
            @click="changeSort(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <table v-if="employees.length" class="employee-table">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Попыток</th>
              <th>Средний %</th>
              <th>Успех</th>
              <th>Среднее время</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in employees" :key="employee.userId">
              <td>
                <div class="employee-name">{{ employee.fullName }}</div>
                <div class="employee-meta">{{ employee.branchName }} · {{ employee.positionName }}</div>
              </td>
              <td>{{ employee.attempts }}</td>
              <td>{{ formatPercent(employee.averageScore) }}</td>
              <td>{{ formatPercent(employee.passRate) }}</td>
              <td>{{ formatDuration(employee.averageTimeSeconds) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="hint">Нет сотрудников, подходящих под выбранные условия.</p>
      </InfoCard>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import PageContainer from "../components/PageContainer.vue";
import InfoCard from "../components/InfoCard.vue";
import LoadingState from "../components/LoadingState.vue";
import BaseSelect from "../components/common/BaseSelect.vue";
import { useAnalyticsStore } from "../store/analyticsStore";
import { showAlert } from "../services/telegram";
import { apiClient } from "../services/apiClient";

const analyticsStore = useAnalyticsStore();

const selectedBranch = ref("");
const selectedPosition = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const isExporting = ref(false);

const isInitialLoading = computed(() => analyticsStore.isLoading && !analyticsStore.summary);
const summary = computed(() => analyticsStore.summary);
const branchRows = computed(() => analyticsStore.branches || []);
const employees = computed(() => analyticsStore.employees || []);
const branchOptions = computed(() => analyticsStore.branchesReference || []);
const positionOptions = computed(() => analyticsStore.positionsReference || []);

const sortOptions = [
  { value: "score", label: "По проценту" },
  { value: "attempts", label: "По попыткам" },
  { value: "passrate", label: "По успеху" },
  { value: "time", label: "По времени" },
];

function formatPercent(value) {
  if (value == null) {
    return "—";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return `${Math.max(0, numeric).toFixed(0)}%`;
}

function formatDuration(seconds) {
  if (seconds == null) {
    return "—";
  }
  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function branchBarWidth(branch) {
  if (!branchRows.value.length) {
    return "0%";
  }
  const maxAttempts = Math.max(...branchRows.value.map((item) => item.attempts));
  if (!maxAttempts) {
    return "0%";
  }
  const percent = (branch.attempts / maxAttempts) * 100;
  return `${Math.max(8, Math.round(percent))}%`;
}

function resetFilters() {
  selectedBranch.value = "";
  selectedPosition.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  applyFilters();
}

async function applyFilters() {
  try {
    analyticsStore.setFilters({
      branchId: selectedBranch.value || null,
      positionId: selectedPosition.value || null,
      from: dateFrom.value || null,
      to: dateTo.value || null,
    });
    await analyticsStore.refreshAll();
  } catch (error) {
    showAlert(error.message || "Не удалось обновить аналитику");
  }
}

function changeSort(value) {
  if (analyticsStore.sortBy === value) {
    return;
  }
  analyticsStore.setSort(value);
  analyticsStore.fetchEmployees().catch((error) => {
    showAlert(error.message || "Не удалось обновить сотрудников");
  });
}

async function exportData() {
  isExporting.value = true;
  try {
    const filters = {
      branchId: selectedBranch.value || null,
      positionId: selectedPosition.value || null,
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      sort: analyticsStore.sortBy,
      format: "excel",
    };

    const response = await apiClient.exportAnalyticsReport(filters, "excel");

    // Создаем blob из ответа
    const blob = new Blob([response], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Создаем ссылку для скачивания
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `analytics_employees_${timestamp}.xlsx`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    showAlert(error.message || "Не удалось экспортировать данные");
  } finally {
    isExporting.value = false;
  }
}

watch([selectedBranch, selectedPosition, dateFrom, dateTo], () => {
  const timer = setTimeout(() => applyFilters(), 200);
  return () => clearTimeout(timer);
});

onMounted(() => {
  analyticsStore.refreshAll().catch((error) => {
    showAlert(error.message || "Не удалось загрузить аналитику");
  });
});
</script>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.filters__row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filters__control {
  flex: 1 1 160px;
}

.filters__date {
  flex: 1 1 140px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 10px;
  font-size: 14px;
  background: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #0a0a0a);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  background: var(--tg-theme-bg-color, #ffffff);
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card__label {
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 12px;
}

.summary-card__value {
  font-size: 20px;
}

.branch-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.branch-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  padding: 12px;
  background: var(--tg-theme-bg-color, #ffffff);
}

.branch-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.branch-item__name {
  font-weight: 600;
}

.branch-item__bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 8px;
}

.branch-item__bar-inner {
  height: 100%;
  background: var(--tg-theme-button-color, #0a84ff);
}

.branch-item__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 6px;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.employee-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.chip {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 6px 12px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: var(--tg-theme-text-color, #0a0a0a);
}

.chip--active {
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
  border-color: transparent;
}

.employee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.employee-table th,
.employee-table td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.employee-name {
  font-weight: 600;
}

.employee-meta {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

@media (max-width: 480px) {
  .employee-table th,
  .employee-table td {
    font-size: 12px;
    padding: 6px;
  }
}
</style>
