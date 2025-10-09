<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-16">
        <div>
          <h1 class="page-title">Управление приглашениями</h1>
          <p class="page-description">{{ stats.total }} приглашений, {{ stats.pending }} активных</p>
        </div>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <PlusIcon class="btn-icon" />
          Создать приглашение
        </button>
      </div>

      <!-- Search and Filters -->
      <div class="filter-section">
        <div class="search-input-wrapper">
          <SearchIcon class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Поиск по имени, фамилии или филиалу..." class="search-input" />
        </div>
        <div class="filters-row">
          <select v-model="statusFilter" class="filter-select">
            <option value="">Все статусы</option>
            <option value="active">Активна</option>
            <option value="used">Использована</option>
            <option value="expired">Истекла</option>
          </select>
          <select v-model="branchFilter" class="filter-select">
            <option value="">Все филиалы</option>
            <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">
              {{ branch.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">Всего приглашений</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">Активны</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.accepted }}</div>
          <div class="stat-label">Использованы</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.expired }}</div>
          <div class="stat-label">Истекло</div>
        </div>
      </div>

      <!-- Invitations Table -->
      <div class="table-section">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Фамилия</th>
                <th>Филиал</th>
                <th>Статус</th>
                <th>Дата создания</th>
                <th>Срок действия</th>
                <th>Ссылка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invitation in paginatedInvitations" :key="invitation.id">
                <td>{{ invitation.firstName }}</td>
                <td>{{ invitation.lastName }}</td>
                <td>{{ invitation.branchName }}</td>
                <td>
                  <span class="status-badge" :class="`status-${invitation.status}`">
                    {{ getStatusText(invitation.status) }}
                  </span>
                  <div v-if="invitation.status === 'used' && invitation.usedByTelegramId" class="text-sm text-secondary mt-1">
                    TG ID: {{ invitation.usedByTelegramId }}
                  </div>
                </td>
                <td>{{ formatDate(invitation.createdAt) }}</td>
                <td>{{ formatDate(invitation.expiresAt) }}</td>
                <td>
                  <button class="btn-copy" @click="copyInviteLink(invitation.code)" title="Копировать ссылку">📋</button>
                </td>
                <td>
                  <div class="actions-cell">
                    <button v-if="invitation.status === 'active'" class="btn-icon" @click="openEditModal(invitation)" title="Редактировать">
                      <EditIcon />
                    </button>
                    <button v-if="invitation.status === 'active'" class="btn-icon" @click="extendInvitation(invitation)" title="Продлить">
                      <SendIcon />
                    </button>
                    <button v-if="invitation.status !== 'used'" class="btn-icon btn-danger" @click="deleteInvitation(invitation)" title="Удалить">
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <button class="pagination-btn" :disabled="currentPage === 1" @click="currentPage--">Предыдущая</button>
          <span class="pagination-info"> Страница {{ currentPage }} из {{ totalPages }} </span>
          <button class="pagination-btn" :disabled="currentPage === totalPages" @click="currentPage++">Следующая</button>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModals">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ showEditModal ? "Редактировать приглашение" : "Создать приглашение" }}</h2>
            <button class="modal-close" @click="closeModals">
              <CloseIcon class="w-5 h-5" />
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="saveInvitation">
              <div class="form-group">
                <label class="form-label">Имя *</label>
                <input v-model="invitationForm.firstName" type="text" class="form-input" required placeholder="Введите имя" />
              </div>

              <div class="form-group">
                <label class="form-label">Фамилия *</label>
                <input v-model="invitationForm.lastName" type="text" class="form-input" required placeholder="Введите фамилию" />
              </div>

              <div class="form-group">
                <label class="form-label">Филиал *</label>
                <select v-model="invitationForm.branchId" class="form-select" required>
                  <option value="">Выберите филиал</option>
                  <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">
                    {{ branch.name }}
                  </option>
                </select>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-outline" @click="closeModals">Отмена</button>
                <button type="submit" class="btn btn-primary">
                  {{ showEditModal ? "Сохранить" : "Создать и отправить" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Result Modal -->
      <div v-if="showResultModal && createdInvitation" class="modal-overlay" @click="closeModals">
        <div class="modal-content result-modal" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">✅ Приглашение создано</h2>
            <button class="modal-close" @click="closeModals">
              <CloseIcon class="w-5 h-5" />
            </button>
          </div>

          <div class="modal-body">
            <div class="result-info">
              <div class="success-message">
                <div class="success-icon">🎉</div>
                <h3>Приглашение успешно создано!</h3>
                <p>Отправьте ссылку приглашения новому управляющему</p>
              </div>

              <div class="invitation-details">
                <div class="detail-row">
                  <span class="detail-label">Имя:</span>
                  <span class="detail-value">{{ createdInvitation.first_name }} {{ createdInvitation.last_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Код приглашения:</span>
                  <span class="detail-value code">{{ createdInvitation.code }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Срок действия:</span>
                  <span class="detail-value">{{ formatDate(createdInvitation.expires_at) }}</span>
                </div>
              </div>

              <div class="invitation-link">
                <label class="form-label">Ссылка для отправки:</label>
                <div class="link-container">
                  <input :value="generateInvitationLink(createdInvitation.code)" readonly class="link-input" @click="$event.target.select()" />
                  <button class="btn btn-secondary copy-btn" @click="copyToClipboard(generateInvitationLink(createdInvitation.code))">
                    📋 Копировать
                  </button>
                </div>
              </div>

              <div class="instructions">
                <h4>Как отправить приглашение:</h4>
                <ol>
                  <li>Скопируйте ссылку выше</li>
                  <li>Отправьте ее новому управляющему через Telegram или другой мессенджер</li>
                  <li>Получатель должен перейти по ссылке и пройти регистрацию</li>
                  <li>После регистрации пользователь получит права управляющего</li>
                </ol>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn btn-primary" @click="closeModals">Готово</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAdminStore } from "../../stores/admin";
import PlusIcon from "../../components/icons/PlusIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";
import DeleteIcon from "../../components/icons/DeleteIcon.vue";
import SendIcon from "../../components/icons/SendIcon.vue";
import CloseIcon from "../../components/icons/CloseIcon.vue";
import SearchIcon from "../../components/icons/SearchIcon.vue";

const adminStore = useAdminStore();

// Реактивные данные
const searchQuery = ref("");
const statusFilter = ref("");
const branchFilter = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;

// Модальные окна
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showResultModal = ref(false);
const createdInvitation = ref(null);
const editingInvitation = ref(null);

// Форма приглашения
const invitationForm = ref({
  firstName: "",
  lastName: "",
  branchId: "",
});

const invitations = computed(() => adminStore.invitations || []);
const branches = computed(() => adminStore.branches || []);

// Вычисляемые свойства
const stats = computed(() => ({
  total: invitations.value.length,
  pending: invitations.value.filter((i) => i.status === "active").length,
  accepted: invitations.value.filter((i) => i.status === "used").length,
  expired: invitations.value.filter((i) => i.status === "expired").length,
}));

const filteredInvitations = computed(() => {
  let filtered = invitations.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (invitation) =>
        invitation.firstName.toLowerCase().includes(query) ||
        invitation.lastName.toLowerCase().includes(query) ||
        invitation.branchName.toLowerCase().includes(query)
    );
  }

  if (statusFilter.value) {
    filtered = filtered.filter((invitation) => invitation.status === statusFilter.value);
  }

  if (branchFilter.value) {
    filtered = filtered.filter((invitation) => String(invitation.branchId) === branchFilter.value);
  }

  return filtered;
});

const paginatedInvitations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredInvitations.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, statusFilter, branchFilter], () => {
  currentPage.value = 1;
});

const totalPages = computed(() => {
  const pages = Math.ceil(filteredInvitations.value.length / itemsPerPage);
  return pages > 0 ? pages : 1;
});

// Методы
const loadInvitations = async () => {
  if (!adminStore.branches.length) {
    await adminStore.loadReferences();
  }
  await adminStore.fetchInvitations();
  currentPage.value = 1;
};

const getStatusText = (status) => {
  const statusMap = {
    active: "Активна",
    used: "Использована",
    expired: "Истекла",
  };
  return statusMap[status] || status;
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "—";
  }
  return new Date(dateString).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const extendInvitation = async (invitation) => {
  if (!invitation?.id) return;
  if (confirm(`Продлить приглашение для ${invitation.firstName} ${invitation.lastName}?`)) {
    try {
      await adminStore.extendInvitation(invitation.id, { days: 7 });
    } catch (error) {
      window.alert(error.message || "Не удалось продлить приглашение");
    }
  }
};

const deleteInvitation = async (invitation) => {
  if (!invitation?.id) return;
  if (confirm(`Удалить приглашение для ${invitation.firstName} ${invitation.lastName}?`)) {
    try {
      await adminStore.deleteInvitation(invitation.id);
    } catch (error) {
      window.alert(error.message || "Не удалось удалить приглашение");
    }
  }
};

const saveInvitation = async () => {
  if (!invitationForm.value.firstName || !invitationForm.value.lastName || !invitationForm.value.branchId) {
    return;
  }
  try {
    if (showEditModal.value && editingInvitation.value) {
      // Редактирование существующего приглашения
      await adminStore.updateInvitation(editingInvitation.value.id, {
        firstName: invitationForm.value.firstName.trim(),
        lastName: invitationForm.value.lastName.trim(),
        branchId: Number(invitationForm.value.branchId),
      });
      window.alert("Приглашение успешно обновлено");
      closeModals();
    } else {
      // Создание нового приглашения
      const invitation = await adminStore.createInvitation({
        firstName: invitationForm.value.firstName.trim(),
        lastName: invitationForm.value.lastName.trim(),
        branchId: Number(invitationForm.value.branchId),
      });

      // Сохраняем данные приглашения для показа
      createdInvitation.value = invitation;

      // Закрываем форму создания и показываем результат
      showCreateModal.value = false;
      showResultModal.value = true;

      // Очищаем форму
      invitationForm.value = {
        firstName: "",
        lastName: "",
        branchId: "",
      };
    }
  } catch (error) {
    window.alert(error.message || "Не удалось сохранить приглашение");
  }
};

const openEditModal = (invitation) => {
  editingInvitation.value = invitation;
  invitationForm.value = {
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    branchId: String(invitation.branchId),
  };
  showEditModal.value = true;
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  showResultModal.value = false;
  createdInvitation.value = null;
  editingInvitation.value = null;

  invitationForm.value = {
    firstName: "",
    lastName: "",
    branchId: "",
  };
};

// Генерация ссылки приглашения
const generateInvitationLink = (code) => {
  // Используем параметр startapp для прямого открытия MiniApp
  const botUsername = import.meta.env.VITE_BOT_USERNAME;
  return `https://t.me/${botUsername}?startapp=invite_${code}`;
};

// Копирование ссылки в буфер обмена
const copyInviteLink = async (code) => {
  const link = generateInvitationLink(code);
  try {
    await navigator.clipboard.writeText(link);
    window.alert("Ссылка скопирована в буфер обмена!");
  } catch (error) {
    console.error("Ошибка копирования:", error);
    window.alert("Не удалось скопировать ссылку");
  }
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    window.alert("Ссылка скопирована в буфер обмена!");
  } catch (error) {
    console.error("Ошибка копирования:", error);
    // Fallback для старых браузеров
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    window.alert("Ссылка скопирована в буфер обмена!");
  }
};

// Инициализация
onMounted(() => {
  loadInvitations().catch((error) => {
    console.error("Не удалось загрузить приглашения", error);
  });
});
</script>

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
  margin-bottom: 12px;
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

.table-section {
  padding: 0;
}

.table-container {
  overflow-x: auto;
  background-color: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--divider);
  margin-bottom: 24px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
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

.actions-cell {
  display: flex;
  gap: 8px;
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

.status-used {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.status-expired {
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

.btn-copy {
  background: none;
  border: 1px solid var(--divider);
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
}

.btn-copy:hover {
  background-color: var(--bg-secondary);
  border-color: var(--accent-blue);
}

.text-sm {
  font-size: 12px;
}

.mt-1 {
  margin-top: 4px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }

  .filters-row {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .modal-header,
  .modal-body {
    padding: 20px;
  }

  .actions-cell {
    flex-direction: column;
    gap: 4px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}

/* Result Modal Styles */
.result-modal {
  max-width: 600px;
}

.success-message {
  text-align: center;
  margin-bottom: 24px;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-message h3 {
  color: var(--success);
  margin-bottom: 8px;
  font-size: 18px;
}

.success-message p {
  color: var(--text-secondary);
  font-size: 14px;
}

.invitation-details {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-value {
  font-weight: 600;
  color: var(--text-primary);
}

.detail-value.code {
  font-family: "Monaco", "Menlo", monospace;
  background-color: var(--bg-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  letter-spacing: 2px;
}

.invitation-link {
  margin-bottom: 24px;
}

.link-container {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.link-input {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  font-family: "Monaco", "Menlo", monospace;
  font-size: 12px;
  color: var(--text-primary);
}

.link-input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.copy-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.instructions {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.instructions h4 {
  margin-bottom: 12px;
  color: var(--text-primary);
  font-size: 16px;
}

.instructions ol {
  margin: 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    margin: 10px;
  }

  .link-container {
    flex-direction: column;
  }

  .link-input {
    font-size: 11px;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
