<template>
  <div class="positions-view">
    <div class="page-header">
      <h2 class="page-heading">Управление должностями</h2>
      <div class="header-buttons">
        <Button icon="plus" @click="openCreateModal">
          <span class="hide-mobile">Добавить должность</span>
          <span class="show-mobile">Добавить</span>
        </Button>
      </div>
    </div>

    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по названию..." @input="loadPositions" />
        <Button variant="secondary" @click="resetFilters" fullWidth icon="refresh-ccw">Сбросить</Button>
      </div>
    </Card>

    <Card padding="none" class="positions-card">
      <Preloader v-if="loading" />

      <div v-else-if="positions.length === 0" class="empty-state">
        <p>Должности не найдены</p>
      </div>

      <div v-else>
        <div class="table-wrapper hide-mobile">
          <table class="positions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Сотрудников</th>
                <th>Аттестаций</th>
                <th>Средний балл</th>
                <th>Дата создания</th>
                <th class="actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="position in positions" :key="position.id">
                <td>{{ position.id }}</td>
                <td class="position-name">{{ position.name }}</td>
                <td>
                  <Badge variant="primary" size="sm">{{ position.employees_count }}</Badge>
                </td>
                <td>{{ position.assessments_completed || 0 }}</td>
                <td>
                  <span v-if="hasScore(position.avg_score)" :class="getScoreClass(position.avg_score)" class="score-value">
                    {{ formatScore(position.avg_score) }}
                  </span>
                  <span v-else class="no-data">—</span>
                </td>
                <td class="date-cell">{{ formatDate(position.created_at) }}</td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <Button size="sm" variant="ghost" icon="pencil" title="Редактировать" @click="openEditModal(position.id)" />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      :title="position.employees_count > 0 ? 'Нельзя удалить должность с сотрудниками' : 'Удалить'"
                      :disabled="position.employees_count > 0"
                      @click="confirmDelete(position)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-cards show-mobile">
          <div v-for="position in positions" :key="position.id" class="position-card">
            <div class="position-card-header">
              <div>
                <h3 class="position-card-name">{{ position.name }}</h3>
                <p class="position-card-id">ID: {{ position.id }}</p>
              </div>
              <Badge variant="primary" size="sm">{{ position.employees_count }} чел.</Badge>
            </div>

            <div class="position-card-body">
              <div class="position-card-row">
                <span class="position-card-label">Аттестаций:</span>
                <span class="position-card-value">{{ position.assessments_completed || 0 }}</span>
              </div>
              <div class="position-card-row">
                <span class="position-card-label">Средний балл:</span>
                <span v-if="hasScore(position.avg_score)" :class="getScoreClass(position.avg_score)" class="position-card-value score-value">
                  {{ formatScore(position.avg_score) }}
                </span>
                <span v-else class="position-card-value no-data">—</span>
              </div>
              <div class="position-card-row">
                <span class="position-card-label">Создана:</span>
                <span class="position-card-value">{{ formatDate(position.created_at) }}</span>
              </div>
            </div>

            <div class="position-card-actions">
              <Button size="sm" variant="secondary" icon="pencil" fullWidth @click="openEditModal(position.id)">Редактировать</Button>
              <Button size="sm" variant="danger" icon="trash" :disabled="position.employees_count > 0" fullWidth @click="confirmDelete(position)">
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <Modal :show="showFormModal" :title="editingId ? 'Редактировать должность' : 'Добавить должность'" @close="closeFormModal">
      <PositionForm :position-id="editingId" @submit="handleFormSubmit" @cancel="closeFormModal" />
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { deletePosition, getPositions } from "../api/positions";
import Preloader from "../components/ui/Preloader.vue";
import Modal from "../components/ui/Modal.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Input from "../components/ui/Input.vue";
import PositionForm from "../components/PositionForm.vue";

const loading = ref(false);
const positions = ref([]);
const filters = ref({ search: "" });
const showFormModal = ref(false);
const editingId = ref(null);

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatScore = (value) => {
  const numeric = toNumber(value);
  return numeric === null ? "—" : `${numeric.toFixed(1)}%`;
};

const getScoreClass = (score) => {
  const numeric = toNumber(score);
  if (numeric === null) {
    return "score-bad";
  }
  return numeric >= 70 ? "score-good" : "score-bad";
};

const hasScore = (value) => toNumber(value) !== null;

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const loadPositions = async () => {
  loading.value = true;
  try {
    const data = await getPositions(filters.value);
    positions.value = (data.positions || []).map((position) => ({
      ...position,
      avg_score: toNumber(position.avg_score),
    }));
  } catch (error) {
    console.error("Load positions error:", error);
    alert("Ошибка загрузки должностей");
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value.search = "";
  loadPositions();
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

const handleFormSubmit = () => {
  closeFormModal();
  loadPositions();
};

const confirmDelete = async (position) => {
  if (position.employees_count > 0) {
    alert(`Невозможно удалить должность "${position.name}". В ней ${position.employees_count} сотрудников.`);
    return;
  }

  if (confirm(`Удалить должность "${position.name}"?`)) {
    try {
      await deletePosition(position.id);
      alert("Должность удалена");
      loadPositions();
    } catch (error) {
      console.error("Delete position error:", error);
      const errorMessage = error.response?.data?.error || "Ошибка удаления должности";
      alert(errorMessage);
    }
  }
};

onMounted(() => {
  loadPositions();
});
</script>

<style scoped>
.positions-view {
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

.filters-card {
  margin-bottom: 32px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 16px;
}

.positions-card {
  overflow: visible;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
}

.positions-table thead {
  border-bottom: 1px solid var(--divider);
}

.positions-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.positions-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.2s ease;
}

.positions-table td {
  padding: 16px;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
}

.position-name {
  font-weight: 600;
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

.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.position-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--divider);
}

.position-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
}

.position-card-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
}

.position-card-id {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.position-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.position-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.position-card-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.position-card-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
}

.position-card-actions {
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

  .position-card-actions {
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
