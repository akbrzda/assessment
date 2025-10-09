<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-24">
        <div>
          <h1 class="title-large">Управление филиалами</h1>
          <p class="body-medium text-secondary">{{ branches.length }} филиалов</p>
        </div>
        <button class="btn btn-primary" @click="openCreateModal">
          <PlusIcon class="w-5 h-5 mr-2" />
          Добавить филиал
        </button>
      </div>

      <!-- Search -->
      <div class="search-section mb-24">
        <div class="search-box">
          <SearchIcon class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Поиск филиалов..." class="search-input" />
        </div>
      </div>

      <!-- Branches Table -->
      <div v-if="filteredBranches.length" class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Город</th>
                <th>Сотрудников</th>
                <th>Создан</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="branch in filteredBranches" :key="branch.id">
                <td>
                  <div class="font-medium">{{ branch.name }}</div>
                </td>
                <td>
                  <span class="text-secondary">{{ branch.city || "—" }}</span>
                </td>
                <td>
                  <span class="badge badge-info">{{ branch.usersCount }} чел.</span>
                </td>
                <td>
                  <span class="text-secondary text-sm">{{ formatDate(branch.createdAt) }}</span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" @click="openEditModal(branch)" title="Редактировать">
                      <EditIcon class="w-5 h-5" />
                    </button>
                    <button class="btn-icon btn-icon-danger" @click="handleDelete(branch)" title="Удалить" :disabled="branch.usersCount > 0">
                      <DeleteIcon class="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">📍</div>
        <h3 class="empty-title">Нет филиалов</h3>
        <p class="empty-description">Создайте первый филиал для начала работы</p>
        <button class="btn btn-primary mt-16" @click="openCreateModal">
          <PlusIcon class="w-5 h-5 mr-2" />
          Добавить филиал
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">{{ isEditMode ? "Редактировать филиал" : "Новый филиал" }}</h2>
          <button class="modal-close" @click="closeModal">
            <CloseIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-group">
            <label class="form-label">Название филиала *</label>
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              :class="{ error: errors.name }"
              placeholder="Например: Сургут-1 (30 лет Победы)"
              required
            />
            <div v-if="errors.name" class="form-error">{{ errors.name }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Город</label>
            <input v-model="form.city" type="text" class="form-input" placeholder="Например: Сургут" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="isLoading">
              {{ isLoading ? "Сохранение..." : isEditMode ? "Сохранить" : "Создать" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { apiClient } from "../../services/apiClient";
import { useTelegramStore } from "../../stores/telegram";
import PlusIcon from "../../components/icons/PlusIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";
import DeleteIcon from "../../components/icons/DeleteIcon.vue";
import SearchIcon from "../../components/icons/SearchIcon.vue";
import CloseIcon from "../../components/icons/CloseIcon.vue";

export default {
  name: "BranchesView",
  components: {
    PlusIcon,
    EditIcon,
    DeleteIcon,
    SearchIcon,
    CloseIcon,
  },
  setup() {
    const telegramStore = useTelegramStore();

    const branches = ref([]);
    const searchQuery = ref("");
    const showModal = ref(false);
    const isEditMode = ref(false);
    const isLoading = ref(false);
    const editingBranch = ref(null);

    const form = ref({
      name: "",
      city: "",
    });

    const errors = ref({
      name: "",
    });

    const filteredBranches = computed(() => {
      if (!searchQuery.value) return branches.value;

      const query = searchQuery.value.toLowerCase();
      return branches.value.filter(
        (branch) => branch.name.toLowerCase().includes(query) || (branch.city && branch.city.toLowerCase().includes(query))
      );
    });

    async function loadBranches() {
      try {
        const response = await apiClient.listBranches();
        branches.value = response.branches || [];
      } catch (error) {
        console.error("Ошибка загрузки филиалов:", error);
        telegramStore.showAlert("Ошибка загрузки филиалов");
      }
    }

    function openCreateModal() {
      isEditMode.value = false;
      editingBranch.value = null;
      form.value = {
        name: "",
        city: "",
      };
      errors.value = {
        name: "",
      };
      showModal.value = true;
    }

    function openEditModal(branch) {
      isEditMode.value = true;
      editingBranch.value = branch;
      form.value = {
        name: branch.name,
        city: branch.city || "",
      };
      errors.value = {
        name: "",
      };
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
      isEditMode.value = false;
      editingBranch.value = null;
      form.value = {
        name: "",
        city: "",
      };
      errors.value = {
        name: "",
      };
    }

    function validateForm() {
      errors.value.name = "";

      if (!form.value.name.trim()) {
        errors.value.name = "Введите название филиала";
        return false;
      }

      if (form.value.name.trim().length < 2) {
        errors.value.name = "Название должно содержать минимум 2 символа";
        return false;
      }

      return true;
    }

    async function handleSubmit() {
      if (!validateForm()) return;

      isLoading.value = true;

      try {
        if (isEditMode.value) {
          await apiClient.updateBranch(editingBranch.value.id, {
            name: form.value.name.trim(),
            city: form.value.city.trim() || null,
          });
          telegramStore.showAlert("Филиал успешно обновлен");
        } else {
          await apiClient.createBranch({
            name: form.value.name.trim(),
            city: form.value.city.trim() || null,
          });
          telegramStore.showAlert("Филиал успешно создан");
        }

        await loadBranches();
        closeModal();
      } catch (error) {
        console.error("Ошибка сохранения:", error);
        telegramStore.showAlert(error.message || "Ошибка сохранения филиала");
      } finally {
        isLoading.value = false;
      }
    }

    async function handleDelete(branch) {
      if (branch.usersCount > 0) {
        telegramStore.showAlert(`Невозможно удалить филиал. В нём ${branch.usersCount} сотрудников. Сначала переместите их в другой филиал.`);
        return;
      }

      const confirmed = await telegramStore.showConfirm(`Вы уверены, что хотите удалить филиал "${branch.name}"?`);

      if (!confirmed) return;

      try {
        await apiClient.deleteBranch(branch.id);
        telegramStore.showAlert("Филиал успешно удален");
        await loadBranches();
      } catch (error) {
        console.error("Ошибка удаления:", error);
        telegramStore.showAlert(error.message || "Ошибка удаления филиала");
      }
    }

    function formatDate(dateString) {
      if (!dateString) return "—";
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    onMounted(() => {
      loadBranches();
    });

    return {
      branches,
      searchQuery,
      filteredBranches,
      showModal,
      isEditMode,
      isLoading,
      form,
      errors,
      openCreateModal,
      openEditModal,
      closeModal,
      handleSubmit,
      handleDelete,
      formatDate,
    };
  },
};
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding-bottom: 80px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title-large {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.body-medium {
  font-size: 16px;
  margin: 0;
}

.text-secondary {
  color: var(--text-secondary);
}

.mb-24 {
  margin-bottom: 24px;
}

.search-section {
  max-width: 400px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 15px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--button-color);
}

.card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 0;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: var(--bg-primary);
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: var(--bg-primary);
}

.font-medium {
  font-weight: 500;
  color: var(--text-primary);
}

.text-sm {
  font-size: 14px;
}

.text-right {
  text-align: right;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.badge-info {
  background: var(--hint-color);
  color: var(--link-color);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-icon {
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-icon-danger:hover:not(:disabled) {
  color: var(--destructive-text-color);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: var(--bg-secondary);
  border-radius: 16px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.empty-description {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--bg-primary);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--button-color);
}

.form-input.error {
  border-color: var(--destructive-text-color);
}

.form-error {
  color: var(--destructive-text-color);
  font-size: 13px;
  margin-top: 4px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: var(--button-color);
  color: var(--button-text-color);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

.mt-16 {
  margin-top: 16px;
}

.mr-2 {
  margin-right: 8px;
}

.w-5 {
  width: 20px;
  height: 20px;
}

.h-5 {
  width: 20px;
  height: 20px;
}

.w-6 {
  width: 24px;
  height: 24px;
}

.h-6 {
  width: 24px;
  height: 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .search-section {
    max-width: 100%;
  }

  .table-container {
    overflow-x: scroll;
  }

  .data-table {
    min-width: 600px;
  }
}
</style>

<style scoped>
.page-container {
  background-color: var(--bg-primary);
  min-height: 100vh;
  padding-bottom: 80px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 20px;
  margin-bottom: 24px;
  gap: 16px;
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

.branches-section {
  padding: 0;
}

.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.branch-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--divider);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.branch-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-blue);
}

.branch-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.branch-info {
  flex: 1;
  min-width: 0;
}

.branch-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  word-break: break-word;
}

.branch-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.branch-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.branch-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.branch-stats {
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: var(--text-primary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
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

.status-inactive {
  background-color: rgba(156, 163, 175, 0.2);
  color: var(--text-secondary);
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

  .branch-card {
    padding: 20px;
  }

  .branch-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .branch-actions {
    justify-content: center;
  }

  .branch-stats {
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
  }

  .branches-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .modal-header,
  .modal-body {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    margin: 10px;
  }
}
</style>
