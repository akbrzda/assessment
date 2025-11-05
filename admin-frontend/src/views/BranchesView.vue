<template>
  <div class="branches-view">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-heading">Управление филиалами</h2>
      <div class="header-buttons">
        <Button icon="👥" @click="openAssignManagerModal" variant="secondary">
          <span class="hide-mobile">Назначить управляющего</span>
          <span class="show-mobile">Управляющий</span>
        </Button>
        <Button icon="➕" @click="openCreateModal">
          <span class="hide-mobile">Добавить филиал</span>
          <span class="show-mobile">Добавить</span>
        </Button>
      </div>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по названию филиала..." icon="🔍" @input="loadBranches" />

        <Button variant="ghost" @click="resetFilters" fullWidth> Сбросить </Button>
      </div>
    </Card>

    <!-- Контент -->
    <Card :no-padding="true" class="branches-card">
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
                  <span v-if="branch.avg_score !== null" :class="getScoreClass(branch.avg_score)" class="score-value">
                    {{ branch.avg_score.toFixed(1) }}%
                  </span>
                  <span v-else class="no-data">—</span>
                </td>
                <td class="date-cell">{{ formatDate(branch.created_at) }}</td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <button @click="openEditModal(branch.id)" class="action-btn action-btn-edit" title="Редактировать">✏️</button>
                    <button
                      @click="confirmDelete(branch)"
                      :disabled="branch.employees_count > 0"
                      :class="['action-btn action-btn-delete', { disabled: branch.employees_count > 0 }]"
                      :title="branch.employees_count > 0 ? 'Нельзя удалить филиал с сотрудниками' : 'Удалить'"
                    >
                      🗑️
                    </button>
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
                <span v-if="branch.avg_score !== null" :class="getScoreClass(branch.avg_score)" class="branch-card-value score-value">
                  {{ branch.avg_score.toFixed(1) }}%
                </span>
                <span v-else class="branch-card-value no-data">—</span>
              </div>
              <div class="branch-card-row">
                <span class="branch-card-label">Создан:</span>
                <span class="branch-card-value">{{ formatDate(branch.created_at) }}</span>
              </div>
            </div>

            <div class="branch-card-actions">
              <Button size="sm" variant="secondary" icon="✏️" @click="openEditModal(branch.id)" fullWidth> Редактировать </Button>
              <Button size="sm" variant="danger" icon="🗑️" @click="confirmDelete(branch)" :disabled="branch.employees_count > 0" fullWidth>
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
    branches.value = data.branches;
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

const getScoreClass = (score) => {
  return score >= 70 ? "score-good" : "score-bad";
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
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-heading {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.hide-mobile {
  display: inline;
}

.show-mobile {
  display: none;
}

/* Filters */
.filters-card {
  margin-bottom: 2rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 1rem;
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
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--divider);
}

.branches-table th {
  padding: 1rem;
  text-align: left;
  font-size: 0.75rem;
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

.branches-table tbody tr:hover {
  background-color: var(--bg-secondary);
}

.branches-table tbody tr.inactive-branch {
  background-color: rgba(128, 128, 128, 0.05);
}

.branches-table td {
  padding: 1rem;
  font-size: 0.9375rem;
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
  font-size: 0.875rem;
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
  font-size: 0.875rem;
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
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
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
  background-color: rgba(255, 59, 48, 0.12);
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
  gap: 1rem;
  padding: 1rem;
}

.branch-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid var(--divider);
}

.branch-card.inactive-branch {
  background-color: rgba(128, 128, 128, 0.05);
}

.branch-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--divider);
}

.branch-card-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.branch-card-id {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
}

.branch-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.branch-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.branch-card-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.branch-card-value {
  font-size: 0.875rem;
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
  gap: 0.5rem;
}

.empty-state {
  padding: 4rem 2rem;
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
    font-size: 1.5rem;
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
