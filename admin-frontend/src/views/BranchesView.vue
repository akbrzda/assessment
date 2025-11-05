<template>
  <div class="branches-view">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-heading">Управление филиалами</h2>
      <div class="header-buttons">
        <Button icon="users" @click="openAssignManagerModal" variant="secondary">
          <span class="hide-mobile">Назначить управляющего</span>
          <span class="show-mobile">Управляющий</span>
        </Button>
        <Button icon="plus" @click="openCreateModal">
          <span class="hide-mobile">Добавить филиал</span>
          <span class="show-mobile">Добавить</span>
        </Button>
      </div>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по названию филиала..." @input="loadBranches" />

        <Button variant="secondary" @click="resetFilters" fullWidth icon="refresh-ccw">Сбросить</Button>
      </div>
    </Card>

    <!-- Контент -->
    <Card padding="none" class="branches-card">
      <Preloader v-if="loading" />

      <div v-else-if="branches.length === 0" class="empty-state">
        <p>Филиалы не найдены</p>
      </div>

      <div v-else>
        <!-- Desktop Table -->
        <div class="table-wrapper hide-mobile">
          <table class="branches-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Город</th>
                <th>Управляющий</th>
                <th>Сотрудников</th>
                <th>Аттестаций</th>
                <th>Средний балл</th>
                <th>Дата создания</th>
                <th class="actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="branch in branches" :key="branch.id" :class="{ 'inactive-branch': !branch.managers }">
                <td>{{ branch.id }}</td>
                <td class="branch-name">{{ branch.name }}</td>
                <td class="city-cell">{{ branch.city || "—" }}</td>
                <td class="managers-cell">
                  <span v-if="branch.managers" class="managers-list">
                    {{ branch.managers }}
                  </span>
                  <span v-else class="no-manager">не назначен</span>
                </td>
                <td>
                  <Badge variant="primary" size="sm">{{ branch.employees_count }}</Badge>
                </td>
                <td>{{ branch.assessments_completed || 0 }}</td>
                <td>
                  <span v-if="hasScore(branch.avg_score)" :class="getScoreClass(branch.avg_score)" class="score-value">
                    {{ formatScore(branch.avg_score) }}
                  </span>
                  <span v-else class="no-data">—</span>
                </td>
                <td class="date-cell">{{ formatDate(branch.created_at) }}</td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <Button size="sm" variant="ghost" @click="openEditModal(branch.id)" icon="pencil" title="Редактировать"></Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      @click="confirmDelete(branch)"
                      :disabled="branch.employees_count > 0"
                      icon="trash"
                      :title="branch.employees_count > 0 ? 'Нельзя удалить филиал с сотрудниками' : 'Удалить'"
                    >
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-cards show-mobile">
          <div v-for="branch in branches" :key="branch.id" class="branch-card" :class="{ 'inactive-branch': !branch.managers }">
            <div class="branch-card-header">
              <div>
                <h3 class="branch-card-name">{{ branch.name }}</h3>
                <p class="branch-card-id">ID: {{ branch.id }}</p>
              </div>
              <Badge variant="primary" size="sm">{{ branch.employees_count }} чел.</Badge>
            </div>

            <div class="branch-card-body">
              <div class="branch-card-row">
                <span class="branch-card-label">Город:</span>
                <span class="branch-card-value">{{ branch.city || "—" }}</span>
              </div>
              <div class="branch-card-row">
                <span class="branch-card-label">Управляющий:</span>
                <span class="branch-card-value">
                  <span v-if="branch.managers" class="managers-list-mobile">{{ branch.managers }}</span>
                  <span v-else class="no-manager">не назначен</span>
                </span>
              </div>
              <div class="branch-card-row">
                <span class="branch-card-label">Аттестаций:</span>
                <span class="branch-card-value">{{ branch.assessments_completed || 0 }}</span>
              </div>
              <div class="branch-card-row">
                <span class="branch-card-label">Средний балл:</span>
                <span v-if="hasScore(branch.avg_score)" :class="getScoreClass(branch.avg_score)" class="branch-card-value score-value">
                  {{ formatScore(branch.avg_score) }}
                </span>
                <span v-else class="branch-card-value no-data">—</span>
              </div>
              <div class="branch-card-row">
                <span class="branch-card-label">Создан:</span>
                <span class="branch-card-value">{{ formatDate(branch.created_at) }}</span>
              </div>
            </div>

            <div class="branch-card-actions">
              <Button size="sm" variant="secondary" icon="pencil" @click="openEditModal(branch.id)" fullWidth> Редактировать </Button>
              <Button size="sm" variant="danger" icon="trash" @click="confirmDelete(branch)" :disabled="branch.employees_count > 0" fullWidth>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Модальное окно создания/редактирования -->
    <Modal :show="showFormModal" :title="editingId ? 'Редактировать филиал' : 'Добавить филиал'" @close="closeFormModal">
      <BranchForm :branchId="editingId" @submit="handleFormSubmit" @cancel="closeFormModal" />
    </Modal>

    <!-- Модальное окно назначения управляющего -->
    <AssignManagerModal :model-value="showAssignManagerModal" @close="closeAssignManagerModal" @assigned="handleManagerAssigned" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getBranches, deleteBranch } from "../api/branches";
import Preloader from "../components/ui/Preloader.vue";
import Modal from "../components/ui/Modal.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Input from "../components/ui/Input.vue";
import BranchForm from "../components/BranchForm.vue";
import AssignManagerModal from "../components/AssignManagerModal.vue";

const loading = ref(false);
const branches = ref([]);
const filters = ref({
  search: "",
});

const showFormModal = ref(false);
const showAssignManagerModal = ref(false);
const editingId = ref(null);

const loadBranches = async () => {
  loading.value = true;
  try {
    const data = await getBranches(filters.value);
    branches.value = (data.branches || []).map((branch) => ({
      ...branch,
      avg_score: toNumber(branch.avg_score),
    }));
  } catch (error) {
    console.error("Load branches error:", error);
    alert("Ошибка загрузки филиалов");
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value.search = "";
  loadBranches();
};

const openCreateModal = () => {
  editingId.value = null;
  showFormModal.value = true;
};

const openEditModal = (id) => {
  editingId.value = id;
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingId.value = null;
};

const openAssignManagerModal = () => {
  showAssignManagerModal.value = true;
};

const closeAssignManagerModal = () => {
  showAssignManagerModal.value = false;
};

const handleFormSubmit = () => {
  closeFormModal();
  loadBranches();
};

const handleManagerAssigned = () => {
  closeAssignManagerModal();
  loadBranches();
};

const confirmDelete = async (branch) => {
  if (branch.employees_count > 0) {
    alert(`Невозможно удалить филиал "${branch.name}". В нем ${branch.employees_count} сотрудников.`);
    return;
  }

  if (confirm(`Вы уверены, что хотите удалить филиал "${branch.name}"?`)) {
    try {
      await deleteBranch(branch.id);
      alert("Филиал удален");
      loadBranches();
    } catch (error) {
      console.error("Delete branch error:", error);
      const errorMessage = error.response?.data?.error || "Ошибка удаления филиала";
      alert(errorMessage);
    }
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const hasScore = (value) => toNumber(value) !== null;

const formatScore = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return "—";
  }
  return `${numeric.toFixed(1)}%`;
};

const getScoreClass = (score) => {
  const numeric = toNumber(score);
  if (numeric === null) {
    return "score-bad";
  }
  return numeric >= 70 ? "score-good" : "score-bad";
};

onMounted(() => {
  loadBranches();
});
</script>

<style scoped>
.branches-view {
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

.header-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
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
  grid-template-columns: 3fr 1fr;
  gap: 16px;
}

.branches-card {
  overflow: visible;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.branches-table {
  width: 100%;
  border-collapse: collapse;
}

.branches-table thead {
  border-bottom: 1px solid var(--divider);
}

.branches-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.branches-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.2s ease;
}

.branches-table tbody tr.inactive-branch {
  background-color: #8080800d;
}

.branches-table td {
  padding: 16px;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
}

.branch-name {
  font-weight: 600;
}

.city-cell {
  color: var(--text-secondary);
}

.managers-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.managers-list {
  color: var(--text-primary);
  font-weight: 500;
}

.no-manager {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 14px;
}

.score-value {
  font-weight: 600;
}

.score-good {
  color: var(--accent-green);
}

.score-bad {
  color: #ff3b30;
}

.no-data {
  color: var(--text-secondary);
}

.date-cell {
  color: var(--text-secondary);
  font-size: 14px;
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
}

.action-btn:hover {
  background-color: var(--bg-secondary);
}

.action-btn-edit:hover {
  background-color: var(--accent-blue-soft);
}

.action-btn-delete:hover {
  background-color: #ff3b301f;
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.disabled:hover {
  background-color: transparent;
}

/* Mobile Cards */
.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.branch-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--divider);
}

.branch-card.inactive-branch {
  background-color: #8080800d;
}

.branch-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
}

.branch-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.branch-card-id {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.branch-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.branch-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.branch-card-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.branch-card-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
}

.managers-list-mobile {
  color: var(--text-primary);
  font-weight: 600;
}

.branch-card-actions {
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
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .branch-card-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-buttons {
    width: 100%;
  }

  .header-buttons button {
    flex: 1;
  }
}
</style>
