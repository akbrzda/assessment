<template>
  <div class="reports-view">
    <!-- Заголовок и кнопки экспорта -->
    <div class="page-header">
      <h1 class="page-heading">Отчёты и аналитика</h1>
      <div class="export-buttons">
        <Button @click="handleExportExcel" :disabled="exporting" variant="ghost" icon="file-chart-column">Экспорт Excel </Button>
        <Button @click="handleExportPDF" :disabled="exporting" variant="primary" icon="file">Экспорт PDF</Button>
      </div>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card">
      <div class="filters-grid">
        <DatePicker v-model="filters.dateFrom" label="Дата от" />
        <DatePicker v-model="filters.dateTo" label="Дата до" />
        <Select v-model="filters.branchId" label="Филиал" :options="branchOptions" />
        <Select v-model="filters.positionId" label="Должность" :options="positionOptions" />
      </div>
      <div class="filter-actions">
        <Button @click="loadData" variant="primary">Применить фильтры</Button>
        <Button variant="secondary" @click="resetFilters" icon="refresh-ccw">Сбросить</Button>
      </div>
    </Card>

    <SkeletonTable v-if="loading" :rows="6" />
    <div v-else class="reports-content">
      <!-- Общая статистика -->
      <div class="stats-grid">
        <Card class="stat-card blue" padding="none">
          <div class="stat-content">
            <div class="stat-label">Всего попыток</div>
            <div class="stat-value">{{ stats.total_attempts || 0 }}</div>
          </div>
        </Card>
        <Card class="stat-card green" padding="none">
          <div class="stat-content">
            <div class="stat-label">Средний балл</div>
            <div class="stat-value">{{ formatAvgScore(stats.avg_score) }}%</div>
          </div>
        </Card>
        <Card class="stat-card purple" padding="none">
          <div class="stat-content">
            <div class="stat-label">Уникальных пользователей</div>
            <div class="stat-value">{{ stats.unique_users || 0 }}</div>
          </div>
        </Card>
        <Card class="stat-card orange" padding="none">
          <div class="stat-content">
            <div class="stat-label">Процент успеха</div>
            <div class="stat-value">{{ formatSuccessRate(stats.passed_count, stats.total_count) }}%</div>
          </div>
        </Card>
      </div>

      <!-- Графики -->
      <div class="charts-grid">
        <!-- График по филиалам с детальной информацией -->
        <Card title="Средний балл по филиалам">
          <div class="chart-container">
            <BarChart
              v-if="detailedBranchAnalytics.length > 0"
              :data="detailedBranchAnalytics"
              labelKey="branch_name"
              valueKey="avg_score"
              color="#36a2ebcc"
              :detail-fields="branchDetailFields"
            />
            <div v-else class="chart-empty">Нет данных</div>
          </div>
        </Card>

        <!-- График по должностям -->
        <Card title="Средний балл по должностям">
          <div class="chart-container">
            <BarChart v-if="positionAnalytics.length > 0" :data="positionAnalytics" labelKey="position_name" valueKey="avg_score" color="#ff9f40cc" />
            <div v-else class="chart-empty">Нет данных</div>
          </div>
        </Card>

        <!-- Комбинированный график филиалы + должности -->
        <Card title="Сравнение филиалов и должностей" class="chart-wide">
          <div class="chart-container">
            <ComboChart v-if="combinedAnalytics.length > 0" :data="combinedAnalytics" />
            <div v-else class="chart-empty">Нет данных</div>
          </div>
        </Card>

        <!-- График динамики с процентами изменения -->
        <Card title="Динамика попыток" class="chart-wide">
          <div class="chart-container">
            <LineChart v-if="trends.length > 0" :data="trends" labelKey="date" valueKey="attempts_count" color="#4bc0c0cc" />
            <div v-else class="chart-empty">Нет данных</div>
          </div>
        </Card>
      </div>

      <!-- Топ сотрудников -->
      <Card title="Топ-10 сотрудников" padding="none">
        <!-- Десктоп -->
        <div class="table-wrapper hide-mobile">
          <table class="top-users-table">
            <thead>
              <tr>
                <th style="width: 80px">Место</th>
                <th>Сотрудник</th>
                <th>Филиал</th>
                <th>Должность</th>
                <th style="width: 120px">Пройдено</th>
                <th style="width: 140px">Средний балл</th>
                <th style="width: 100px">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="topUsers.length === 0">
                <td colspan="7" class="empty-state">Нет данных</td>
              </tr>
              <tr v-for="(user, index) in topUsers" :key="user.id">
                <td class="rank-cell">
                  <span
                    :class="{
                      'rank-1': index === 0,
                      'rank-2': index === 1,
                      'rank-3': index === 2,
                    }"
                  >
                    {{ index + 1 }}
                  </span>
                </td>
                <td class="user-name">{{ user.first_name }} {{ user.last_name }}</td>
                <td>{{ user.branch_name || "—" }}</td>
                <td>{{ user.position_name || "—" }}</td>
                <td class="attempts-cell">{{ user.total_assessments }}</td>
                <td class="score-cell">{{ formatUserScore(user.avg_score) }}%</td>
                <td>
                  <button @click="openUserReport(user.id)" class="action-btn" title="Посмотреть отчёт"></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Мобильные карточки -->
        <div class="mobile-cards show-mobile">
          <div v-if="topUsers.length === 0" class="empty-state">Нет данных</div>
          <div v-for="(user, index) in topUsers" :key="user.id" class="mobile-card">
            <div class="mobile-card-header">
              <span
                :class="{
                  'rank-1': index === 0,
                  'rank-2': index === 1,
                  'rank-3': index === 2,
                }"
                class="rank-badge"
              >
                #{{ index + 1 }}
              </span>
              <span class="user-name-mobile">{{ user.first_name }} {{ user.last_name }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-label">Филиал</span>
              <span class="mobile-value">{{ user.branch_name || "—" }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-label">Должность</span>
              <span class="mobile-value">{{ user.position_name || "—" }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-label">Пройдено</span>
              <span class="mobile-value">{{ user.total_assessments }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-label">Средний балл</span>
              <span class="mobile-value score-cell">{{ formatUserScore(user.avg_score) }}%</span>
            </div>
            <Button @click="openUserReport(user.id)" size="sm" class="mt-2">Отчёт</Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Модальные окна -->
    <UserReportModal v-model="userReportModalOpen" :userId="selectedUserId" :filters="filters" @close="userReportModalOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  getOverallStats,
  getBranchAnalytics,
  getPositionAnalytics,
  getTopUsers,
  getAssessmentTrends,
  getDetailedBranchAnalytics,
  getCombinedAnalytics,
  exportToExcel,
  exportToPDF,
} from "@/api/analytics";
import { getReferences } from "@/api/users";
import Card from "@/components/ui/Card.vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Select from "@/components/ui/Select.vue";
import Preloader from "@/components/ui/Preloader.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import SkeletonTable from "@/components/ui/SkeletonTable.vue";
import BarChart from "@/components/charts/BarChart.vue";
import LineChart from "@/components/charts/LineChart.vue";
import ComboChart from "@/components/charts/ComboChart.vue";
import UserReportModal from "@/modules/reports/components/UserReportModal.vue";
import { useToast } from "@/composables/useToast";
import { formatBranchLabel } from "@/utils/branch";

const loading = ref(false);
const exporting = ref(false);
const { showToast } = useToast();
const userReportModalOpen = ref(false);
const selectedUserId = ref(null);

const filters = ref({
  dateFrom: "",
  dateTo: "",
  branchId: "",
  positionId: "",
});

const references = ref({ branches: [], positions: [] });
const stats = ref({});
const branchAnalytics = ref([]);
const detailedBranchAnalytics = ref([]);
const positionAnalytics = ref([]);
const combinedAnalytics = ref([]);
const topUsers = ref([]);
const trends = ref([]);

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatPercentValue = (value, decimals = 1, fallback = "—") => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return fallback;
  }
  return `${numeric.toFixed(decimals)}%`;
};

const formatAvgScore = (value, decimals = 1) => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return "0";
  }
  return numeric.toFixed(decimals);
};

const formatSuccessRate = (passed, total, decimals = 1) => {
  const passedNumeric = toNumber(passed);
  const totalNumeric = toNumber(total);
  if (passedNumeric === null || !totalNumeric) {
    return "0";
  }
  return ((passedNumeric / totalNumeric) * 100).toFixed(decimals);
};

const formatUserScore = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return "0";
  }
  return numeric.toFixed(1);
};

// Детальные поля для BarChart по филиалам
const branchDetailFields = [
  { key: "unique_users", label: "Участников" },
  { key: "median_score", label: "Медиана", format: (v) => formatPercentValue(v, 1) },
  { key: "excellent_percent", label: "Отличных", format: (v) => formatPercentValue(v, 0) },
  { key: "pass_percent", label: "Успешных", format: (v) => formatPercentValue(v, 0) },
];

// Опции для Select
const branchOptions = computed(() => [
  { value: "", label: "Все филиалы" },
  ...references.value.branches.map((branch) => ({ value: branch.id, label: formatBranchLabel(branch) })),
]);

const positionOptions = computed(() => [
  { value: "", label: "Все должности" },
  ...references.value.positions.map((position) => ({ value: position.id, label: position.name })),
]);

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = data;
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [statsData, branchData, detailedBranchData, positionData, usersData, trendsData, combinedData] = await Promise.all([
      getOverallStats(filters.value),
      getBranchAnalytics(filters.value),
      getDetailedBranchAnalytics(filters.value),
      getPositionAnalytics(filters.value),
      getTopUsers({ ...filters.value, limit: 10 }),
      getAssessmentTrends(filters.value),
      getCombinedAnalytics(filters.value),
    ]);

    stats.value = statsData?.stats || {};
    branchAnalytics.value = (branchData?.branches || [])
      .map((branch) => ({
        ...branch,
        avg_score: toNumber(branch.avg_score),
      }))
      .filter((branch) => branch.avg_score !== null);
    detailedBranchAnalytics.value = (detailedBranchData?.branches || [])
      .map((branch) => ({
        ...branch,
        avg_score: toNumber(branch.avg_score),
        median_score: toNumber(branch.median_score),
        excellent_percent: toNumber(branch.excellent_percent),
        pass_percent: toNumber(branch.pass_percent),
      }))
      .filter((branch) => branch.avg_score !== null);
    positionAnalytics.value = (positionData?.positions || [])
      .map((position) => ({
        ...position,
        avg_score: toNumber(position.avg_score),
      }))
      .filter((position) => position.avg_score !== null);
    combinedAnalytics.value = (combinedData?.combined || []).map((item) => ({
      ...item,
      avg_score: toNumber(item.avg_score),
    }));
    topUsers.value = (usersData?.users || []).map((user) => ({
      ...user,
      avg_score: toNumber(user.avg_score),
    }));
    trends.value = trendsData?.trends || [];
  } catch (error) {
    console.error("Load data error:", error);
    showToast("Ошибка загрузки данных", "error");
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = {
    dateFrom: "",
    dateTo: "",
    branchId: "",
    positionId: "",
  };
  loadData();
};

const handleExportExcel = async () => {
  exporting.value = true;
  try {
    await exportToExcel("branches", filters.value);
  } catch (error) {
    console.error("Export Excel error:", error);
    showToast("Ошибка экспорта в Excel", "error");
  } finally {
    exporting.value = false;
  }
};

const handleExportPDF = async () => {
  exporting.value = true;
  try {
    await exportToPDF("branches", filters.value);
  } catch (error) {
    console.error("Export PDF error:", error);
    showToast("Ошибка экспорта в PDF", "error");
  } finally {
    exporting.value = false;
  }
};

const openUserReport = (userId) => {
  selectedUserId.value = userId;
  userReportModalOpen.value = true;
};

onMounted(async () => {
  await loadReferences();
  await loadData();
});
</script>

<style scoped>
.reports-view {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.export-buttons {
  display: flex;
  gap: 12px;
}

.filters-card {
  margin-bottom: 32px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.hide-mobile {
  display: block;
}

.show-mobile {
  display: none;
}

.reports-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Статистика */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  overflow: hidden;
}

.stat-content {
  padding: 24px;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
}

.stat-card.blue .stat-content {
  background: linear-gradient(135deg, #3b82f610 0%, #3b82f620 100%);
}

.stat-card.blue .stat-label {
  color: #3b82f6;
}

.stat-card.blue .stat-value {
  color: #1e40af;
}

.stat-card.green .stat-content {
  background: linear-gradient(135deg, #10b98110 0%, #10b98120 100%);
}

.stat-card.green .stat-label {
  color: #10b981;
}

.stat-card.green .stat-value {
  color: #047857;
}

.stat-card.purple .stat-content {
  background: linear-gradient(135deg, #8b5cf610 0%, #8b5cf620 100%);
}

.stat-card.purple .stat-label {
  color: #8b5cf6;
}

.stat-card.purple .stat-value {
  color: #6d28d9;
}

.stat-card.orange .stat-content {
  background: linear-gradient(135deg, #f5935110 0%, #f5935120 100%);
}

.stat-card.orange .stat-label {
  color: #f59351;
}

.stat-card.orange .stat-value {
  color: #ea580c;
}

/* Графики */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-container {
  height: 256px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Таблица топ пользователей */
.table-wrapper {
  overflow-x: auto;
}

.top-users-table {
  width: 100%;
  border-collapse: collapse;
}

.top-users-table th {
  background: var(--bg-secondary);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.top-users-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  color: var(--text-primary);
}

.top-users-table tbody tr:last-child td {
  border-bottom: none;
}

.rank-cell {
  font-weight: 700;
  font-size: 16px;
}

.rank-1 {
  color: #eab308;
}

.rank-2 {
  color: #9ca3af;
}

.rank-3 {
  color: #ea580c;
}

.user-name {
  font-weight: 500;
}

.attempts-cell {
  color: var(--text-secondary);
}

.score-cell {
  font-weight: 600;
  color: #10b981;
}

.empty-state {
  text-align: center;
  padding: 40px 20px !important;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Мобильные карточки */
.mobile-cards {
  padding: 16px;
}

.mobile-card {
  border-bottom: 1px solid var(--border-color);
  padding: 16px 0;
}

.mobile-card:last-child {
  border-bottom: none;
}

.mobile-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.rank-badge {
  font-size: 18px;
  font-weight: 700;
}

.user-name-mobile {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.mobile-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.mobile-card-row:last-child {
  margin-bottom: 0;
}

.mobile-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.mobile-value {
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
}

/* Адаптивность */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .hide-mobile {
    display: none !important;
  }

  .show-mobile {
    display: block !important;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-heading {
    font-size: 24px;
  }

  .export-buttons {
    width: 100%;
  }

  .export-buttons button {
    flex: 1;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .export-buttons {
    flex-direction: column;
  }
}

.action-btn {
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--primary-hover);
  transform: scale(1.1);
}
</style>
