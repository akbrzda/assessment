<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-16">
        <div>
          <h1 class="page-title">Управление тестированиями</h1>
          <p class="page-description">{{ stats.total }} тестирований, {{ stats.active }} активных</p>
        </div>
        <button class="btn btn-primary" @click="createAssessment">
          <PlusIcon class="btn-icon" />
          Создать тестирование
        </button>
      </div>

      <!-- Search and Filters -->
      <div class="filter-section">
        <div class="search-input-wrapper">
          <SearchIcon class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Поиск по названию или описанию..." class="search-input" />
        </div>

        <div class="filters-row">
          <select v-model="statusFilter" class="filter-select">
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="pending">Ожидают открытия</option>
            <option value="completed">Завершенные</option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="createdAt">По дате создания</option>
            <option value="title">По названию</option>
            <option value="participantsCount">По количеству участников</option>
          </select>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">Всего тестирований</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.active }}</div>
          <div class="stat-label">Активные</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.participants }}</div>
          <div class="stat-label">Участников</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.completions }}</div>
          <div class="stat-label">Завершений</div>
        </div>
      </div>

      <!-- Assessments List -->
      <div class="assessments-section">
        <div v-if="filteredAssessments.length" class="assessments-grid">
          <div v-for="assessment in paginatedAssessments" :key="assessment.id" class="assessment-card">
            <div class="assessment-header">
              <div class="assessment-info">
                <div class="assessment-title">{{ assessment.title }}</div>
                <div class="assessment-description">{{ assessment.description }}</div>
                <div class="assessment-meta">
                  <span class="status-badge" :class="`status-${assessment.status}`">
                    {{ getStatusText(assessment.status) }}
                  </span>
                  <span class="meta-text">{{ formatDate(assessment.createdAt) }}</span>
                </div>
              </div>

              <div class="assessment-actions">
                <button class="btn-icon" @click="editAssessment(assessment)" title="Редактировать">
                  <EditIcon />
                </button>
                <button class="btn-icon" @click="viewResults(assessment)" title="Результаты">
                  <StatisticsIcon />
                </button>
                <button class="btn-icon" @click="duplicateAssessment(assessment)" title="Дублировать">
                  <CopyIcon />
                </button>
                <button class="btn-icon btn-danger" @click="deleteAssessment(assessment)" title="Удалить">
                  <DeleteIcon />
                </button>
              </div>
            </div>

            <div class="assessment-stats">
              <div class="stat-item">
                <span class="stat-value">{{ assessment.participantsCount }}</span>
                <span class="stat-label">участников</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ assessment.completedCount }}</span>
                <span class="stat-label">завершили</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ assessment.averageScore }}%</span>
                <span class="stat-label">средний балл</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ assessment.passRate }}%</span>
                <span class="stat-label">процент успеха</span>
              </div>
            </div>

            <div class="assessment-details">
              <div class="detail-row">
                <span class="detail-label">Время:</span>
                <span class="detail-value">{{ assessment.timeLimit }} мин</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Вопросов:</span>
                <span class="detail-value">{{ assessment.questionsCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <AssessmentIcon class="w-12 h-12" />
          </div>
          <h3 class="empty-title">Нет тестирований</h3>
          <p class="empty-description">Создайте первое тестирование для начала работы</p>
          <button class="btn btn-primary" @click="createAssessment">
            <PlusIcon class="btn-icon" />
            Создать тестирование
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="filteredAssessments.length > itemsPerPage" class="pagination">
        <button class="pagination-btn" :disabled="currentPage === 1" @click="currentPage--">
          <ChevronLeftIcon class="w-4 h-4" />
          Предыдущая
        </button>
        <span class="pagination-info">Страница {{ currentPage }} из {{ totalPages }}</span>
        <button class="pagination-btn" :disabled="currentPage === totalPages" @click="currentPage++">
          Следующая
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import { useUnsavedChanges } from "../../composables/useUnsavedChanges";
import { useAdminStore } from "../../stores/admin";
import PlusIcon from "../../components/icons/PlusIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";
import DeleteIcon from "../../components/icons/DeleteIcon.vue";
import StatisticsIcon from "../../components/icons/StarIcon.vue";
import CopyIcon from "../../components/icons/CopyIcon.vue";
import SearchIcon from "../../components/icons/SearchIcon.vue";
import AssessmentIcon from "../../components/icons/AssessmentIcon.vue";
import CloseIcon from "../../components/icons/CloseIcon.vue";
import ChevronLeftIcon from "../../components/icons/ChevronLeftIcon.vue";
import ChevronRightIcon from "../../components/icons/ChevronRightIcon.vue";

const { markAsUnsaved, markAsSaved } = useUnsavedChanges("assessments-admin");
const adminStore = useAdminStore();

// Реактивные данные
const assessments = ref([]);
const searchQuery = ref("");
const statusFilter = ref("");
const sortBy = ref("createdAt");
const currentPage = ref(1);
const itemsPerPage = 10;

const selectedAssessment = ref(null);

// Направления
const branches = computed(() => adminStore.branches || []);

// Вычисляемые свойства
const stats = computed(() => ({
  total: assessments.value.length,
  active: assessments.value.filter((a) => a.status === "active").length,
  participants: assessments.value.reduce((sum, a) => sum + a.participantsCount, 0),
  completions: assessments.value.reduce((sum, a) => sum + a.completedCount, 0),
}));

const filteredAssessments = computed(() => {
  let filtered = assessments.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (assessment) => assessment.title.toLowerCase().includes(query) || assessment.description.toLowerCase().includes(query)
    );
  }

  if (statusFilter.value) {
    filtered = filtered.filter((assessment) => assessment.status === statusFilter.value);
  }

  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case "title":
        return a.title.localeCompare(b.title);
      case "participantsCount":
        return b.participantsCount - a.participantsCount;
      case "createdAt":
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return filtered;
});

const totalPages = computed(() => Math.ceil(filteredAssessments.value.length / itemsPerPage));

const paginatedAssessments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredAssessments.value.slice(start, end);
});

// Методы
const getBranchName = (branchId) => {
  const branch = branches.value.find((b) => b.id === branchId);
  return branch ? branch.name : "Не указан";
};

const mapAssessment = (item) => {
  const statusMap = {
    pending: "pending",
    active: "active",
    closed: "completed",
  };
  return {
    id: item.id,
    title: item.title,
    description: item.description || "",
    status: statusMap[item.status] || item.status,
    branchId: item.branchId || null,
    participantsCount: item.assignedCount || 0,
    completedCount: item.completedCount || 0,
    averageScore: 0,
    passRate: 0,
    timeLimit: item.timeLimitMinutes || 0,
    questionsCount: item.questionsCount || 0,
    createdAt: item.createdAt || item.openAt || new Date().toISOString(),
  };
};

const loadAssessments = async () => {
  if (!adminStore.branches.length) {
    await adminStore.loadReferences();
  }
  await adminStore.fetchAssessments();
  assessments.value = adminStore.assessments.map(mapAssessment);
};

const getStatusText = (status) => {
  const statusMap = {
    active: "Активное",
    pending: "Ожидает открытия",
    completed: "Завершенное",
  };
  return statusMap[status] || status;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const { $router } = getCurrentInstance().proxy;

const createAssessment = () => {
  $router.push("/admin/assessments/create");
};

const editAssessment = (assessment) => {
  $router.push(`/admin/assessments/${assessment.id}/edit`);
};

const viewResults = (assessment) => {
  // TODO: Перейти на страницу результатов
  window.alert("Просмотр результатов будет добавлен позднее.");
};

const duplicateAssessment = (assessment) => {
  // TODO: Реализовать дублирование
  window.alert("Дублирование будет добавлено позднее.");
};

const deleteAssessment = async (assessment) => {
  if (confirm(`Вы уверены, что хотите удалить аттестацию "${assessment.title}"?`)) {
    try {
      await adminStore.deleteAssessment(assessment.id);
      await loadAssessments();
    } catch (error) {
      console.error("Ошибка удаления аттестации", error);
      alert("Ошибка удаления аттестации");
    }
  }
};



// Инициализация
onMounted(() => {
  loadAssessments().catch((error) => {
    console.error("Не удалось загрузить тестирования", error);
  });
});
</script>

<style scoped>
.page-container {
  background-color: var(--bg-primary);
  min-height: 100vh;
  padding-bottom: 80px;
}

.page-header {
  padding-top: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.page-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.filter-section {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--divider);
  padding: 12px;
  margin-bottom: 24px;
  border-radius: 16px;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid var(--divider);
  border-radius: 12px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 16px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.filters-row {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px 16px;
  border: 2px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  min-width: 160px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--divider);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.assessments-section {
  padding: 0;
}

.assessments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.assessment-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--divider);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assessment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-blue);
}

.assessment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.assessment-info {
  flex: 1;
  min-width: 0;
}

.assessment-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  word-break: break-word;
}

.assessment-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  overflow: hidden;
}

.assessment-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.assessment-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.assessment-stats {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid var(--divider);
  border-bottom: 1px solid var(--divider);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.assessment-details {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background-color: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--divider);
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.pagination-btn {
  padding: 10px 16px;
  border: 2px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--divider);
}

.modal-large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--divider);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 16px;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.results-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--divider);
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--divider);
}

.data-table th {
  font-weight: 600;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.data-table td {
  color: var(--text-primary);
}

.data-table tr:last-child td {
  border-bottom: none;
}

/* Status badges */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.status-pending {
  background-color: rgba(156, 163, 175, 0.2);
  color: var(--text-secondary);
}

.status-completed {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.status-passed {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.status-failed {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background-color: var(--accent-blue);
  color: white;
}

.btn-primary:hover {
  background-color: var(--accent-blue-hover);
}

.btn-outline {
  background-color: transparent;
  color: var(--text-primary);
  border: 2px solid var(--divider);
}

.btn-outline:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.btn-danger {
  background-color: var(--error);
  color: white;
}

.btn-danger:hover {
  background-color: var(--error-hover);
}

.btn-icon {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.btn-icon.btn-danger {
  color: var(--error);
}

.btn-icon.btn-danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-header,
  .modal-body {
    padding: 20px;
  }

  .results-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-container {
    font-size: 14px;
  }

  .actions-cell {
    flex-direction: column;
    gap: 4px;
  }

  .assessment-cell {
    min-width: 150px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .results-stats {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .modal-content {
    margin: 10px;
  }
}
.assessments-view {
  padding: 20px;
}

.assessments-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 30px;
}

.assessments-header h1 {
  margin: 0;
  color: var(--tg-theme-text-color);
}

.filters-section {
  background: var(--tg-theme-bg-color);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid var(--tg-theme-hint-color);
}

.search-container {
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 8px;
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 16px;
}

.filters-container {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 6px;
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 14px;
  min-width: 160px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.assessment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assessment-title {
  font-weight: 600;
  color: var(--tg-theme-text-color);
}

.assessment-description {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  line-height: 1.3;
}

.participants-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.participants-count {
  font-weight: 600;
  color: var(--tg-theme-text-color);
}

.participants-completed {
  font-size: 12px;
  color: var(--tg-theme-hint-color);
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.results-table-container h3 {
  margin: 20px 0 10px 0;
  color: var(--tg-theme-text-color);
}

.modal-large {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

@media (max-width: 768px) {
  .assessments-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .filters-container {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .results-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .assessments-view {
    padding: 15px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .results-stats {
    grid-template-columns: 1fr;
  }
}
</style>
