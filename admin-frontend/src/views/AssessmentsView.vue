<template>
  <div class="assessments-view">
    <!-- Header -->
    <div class="page-header">
      <Button v-if="authStore.isSuperAdmin || authStore.isManager" icon="plus" @click="goToCreate">
        <span class="hide-mobile">Создать аттестацию</span>
        <span class="show-mobile">Создать</span>
      </Button>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по названию..." @input="loadAssessments" />

        <Select v-model="filters.status" :options="statusOptions" placeholder="Все статусы" @change="loadAssessments" />

        <Select v-model="filters.branch" :options="branchOptions" placeholder="Все филиалы" @change="loadAssessments" />

        <Button variant="secondary" @click="resetFilters" fullWidth icon="refresh-ccw">Сбросить</Button>
      </div>
    </Card>

    <!-- Контент -->
    <Card padding="none" class="assessments-card">
      <Preloader v-if="loading" />

      <div v-else-if="assessments.length === 0" class="empty-state">
        <p>Аттестации не найдены</p>
      </div>

      <div v-else>
        <!-- Desktop Table -->
        <div class="table-wrapper hide-mobile">
          <table class="assessments-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                <th>Открытие</th>
                <th>Закрытие</th>
                <th>Назначено</th>
                <th>Завершено</th>
                <th>Средний балл</th>
                <th class="actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="assessment in assessments" :key="assessment.id">
                <td>
                  <div class="assessment-title">{{ assessment.title }}</div>
                  <div class="assessment-desc">{{ assessment.description || "Нет описания" }}</div>
                </td>
                <td>
                  <Badge :variant="getStatusVariant(assessment.status)" size="sm" rounded>
                    {{ getStatusLabel(assessment.status) }}
                  </Badge>
                </td>
                <td class="dates-cell">
                  <div>{{ formatDate(assessment.open_at) }}</div>
                </td>
                <td class="dates-cell">
                  <div>{{ formatDate(assessment.close_at) }}</div>
                </td>
                <td>{{ assessment.assigned_users }} чел.</td>
                <td>{{ assessment.completed_attempts }}</td>
                <td class="score-cell">
                  {{ formatAvgScore(assessment.avg_score) }}
                </td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <Button @click="goToDetails(assessment.id)" class="action-btn action-btn-info" title="Детали" icon="chart-column"></Button>
                    <Button
                      v-if="canEditAssessment(assessment)"
                      @click="goToEdit(assessment.id)"
                      class="action-btn action-btn-edit"
                      title="Редактировать"
                      icon="pencil"
                    ></Button>
                    <Button
                      v-if="assessment.status === 'pending'"
                      @click="confirmDelete(assessment)"
                      class="action-btn action-btn-delete"
                      title="Удалить"
                      icon="trash"
                    ></Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-cards show-mobile">
          <div v-for="assessment in assessments" :key="assessment.id" class="assessment-card">
            <div class="assessment-card-header">
              <div>
                <h3 class="assessment-card-title">{{ assessment.title }}</h3>
                <p class="assessment-card-desc">{{ assessment.description || "Нет описания" }}</p>
              </div>
              <Badge :variant="getStatusVariant(assessment.status)" size="sm" rounded>
                {{ getStatusLabel(assessment.status) }}
              </Badge>
            </div>

            <div class="assessment-card-body">
              <div class="assessment-card-row">
                <span class="assessment-card-label">Открытие:</span>
                <span class="assessment-card-value">{{ formatDate(assessment.open_at) }}</span>
              </div>
              <div class="assessment-card-row">
                <span class="assessment-card-label">Закрытие:</span>
                <span class="assessment-card-value">{{ formatDate(assessment.close_at) }}</span>
              </div>
              <div class="assessment-card-row">
                <span class="assessment-card-label">Назначено:</span>
                <span class="assessment-card-value">{{ assessment.assigned_users }} чел.</span>
              </div>
              <div class="assessment-card-row">
                <span class="assessment-card-label">Завершено:</span>
                <span class="assessment-card-value">{{ assessment.completed_attempts }}</span>
              </div>
              <div class="assessment-card-row">
                <span class="assessment-card-label">Средний балл:</span>
                <span class="assessment-card-value score-value">
                  {{ formatAvgScore(assessment.avg_score) }}
                </span>
              </div>
            </div>

            <div class="assessment-card-actions">
              <Button size="sm" variant="secondary" icon="chart-column" @click="goToDetails(assessment.id)" fullWidth> Детали </Button>
              <Button v-if="canEditAssessment(assessment)" size="sm" variant="primary" icon="pencil" @click="goToEdit(assessment.id)" fullWidth>
                Редактировать
              </Button>
              <Button v-if="assessment.status === 'pending'" size="sm" variant="danger" icon="trash" @click="confirmDelete(assessment)" fullWidth>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { getAssessments, deleteAssessment } from "../api/assessments";
import Preloader from "../components/ui/Preloader.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import { useToast } from "../composables/useToast";

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const assessments = ref([]);
const filters = ref({
  search: "",
  status: "",
  branch: "",
});
const { showToast } = useToast();

const references = ref({
  branches: [],
});

const statusOptions = computed(() => [
  { value: "", label: "Все статусы" },
  { value: "pending", label: "Ожидает" },
  { value: "open", label: "Открыта" },
  { value: "closed", label: "Закрыта" },
]);

const branchOptions = computed(() => [
  { value: "", label: "Все филиалы" },
  ...references.value.branches.map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  })),
]);

const loadReferences = async () => {
  try {
    const { getReferences } = await import("../api/users");
    const data = await getReferences();
    references.value.branches = data.branches || [];
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadAssessments = async () => {
  loading.value = true;
  try {
    const data = await getAssessments(filters.value);
    assessments.value = data.assessments;
  } catch (error) {
    console.error("Load assessments error:", error);
    showToast("Ошибка загрузки аттестаций", "error");
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = {
    search: "",
    status: "",
    branch: "",
  };
  loadAssessments();
};

const goToCreate = () => {
  router.push("/assessments/create");
};

const goToDetails = (id) => {
  router.push(`/assessments/${id}`);
};

const goToEdit = (id) => {
  router.push(`/assessments/${id}/edit`);
};

const canEditAssessment = (assessment) => {
  // Можно редактировать только если нет попыток и статус pending или open
  return assessment.total_attempts === 0 && (assessment.status === "pending" || assessment.status === "open");
};

const confirmDelete = async (assessment) => {
  if (confirm(`Вы уверены, что хотите удалить аттестацию "${assessment.title}"?`)) {
    try {
      await deleteAssessment(assessment.id);
      showToast("Аттестация удалена", "success");
      loadAssessments();
    } catch (error) {
      console.error("Delete assessment error:", error);
      showToast("Ошибка удаления аттестации", "error");
    }
  }
};

const getStatusLabel = (status) => {
  const labels = {
    pending: "Ожидает",
    open: "Открыта",
    closed: "Закрыта",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    pending: "warning",
    open: "success",
    closed: "default",
  };
  return variants[status] || "default";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAvgScore = (score) => {
  if (score === null || score === undefined || score === "") {
    return "—";
  }
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) {
    return "—";
  }
  return `${numericScore.toFixed(1)}%`;
};

onMounted(() => {
  loadReferences();
  loadAssessments();
});
</script>

<style scoped>
.assessments-view {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 16px;
  margin-bottom: 32px;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.show-mobile {
  display: none;
}

/* Filters */
.filters-card {
  margin-bottom: 32px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 8px;
}

.assessments-card {
  overflow: visible;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.assessments-table {
  width: 100%;
  border-collapse: collapse;
}

.assessments-table thead {
  border-bottom: 1px solid var(--divider);
}

.assessments-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.assessments-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.2s ease;
}

.assessments-table td {
  padding: 16px;
  font-size: 15px;
  color: var(--text-primary);
}

.assessment-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.assessment-desc {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dates-cell {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.dates-cell div:first-child {
  margin-bottom: 4px;
}

.score-cell {
  font-weight: 600;
  color: var(--accent-blue);
}

.actions-col {
  text-align: right;
}

.actions-cell {
  text-align: right;
}

.actions-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.action-btn:hover {
  background-color: var(--bg-secondary);
}

.action-btn-info:hover {
  background-color: var(--accent-blue-soft);
}

.action-btn-edit:hover {
  background-color: var(--accent-blue-soft);
}

.action-btn-delete:hover {
  background-color: #ff3b301f;
}

/* Mobile Cards */
.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.assessment-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--divider);
}

.assessment-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
}

.assessment-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.assessment-card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
}

.assessment-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.assessment-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.assessment-card-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.assessment-card-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
}

.score-value {
  color: var(--accent-blue);
}

.assessment-card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.empty-state {
  padding: 64px 32px;
  text-align: center;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .hide-mobile {
    display: none !important;
  }

  .show-mobile {
    display: inline !important;
  }

  .table-wrapper {
    display: none !important;
  }

  .mobile-cards {
    display: flex !important;
  }

  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .assessment-card-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
