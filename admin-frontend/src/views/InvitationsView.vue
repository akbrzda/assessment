<template>
  <div class="invitations-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <p class="page-stats">Всего {{ stats.total }} • Активно {{ stats.active }} • Использовано {{ stats.used }} • Истекло {{ stats.expired }}</p>
      </div>
      <Button icon="plus" @click="openCreateModal">
        <span class="hide-mobile">Создать приглашение</span>
        <span class="show-mobile">Создать</span>
      </Button>
    </div>

    <!-- Filters -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Имя, фамилия, филиал или код..." />

        <Select v-model="filters.status" :options="statusOptions" placeholder="Все статусы" />

        <Select v-model="filters.branch" :options="branchOptions" placeholder="Все филиалы" />
      </div>
    </Card>

    <!-- Content -->
    <Card padding="none" class="invitations-card">
      <Preloader v-if="loading" />

      <div v-else-if="paginatedInvitations.length === 0" class="empty-state">
        <p>Приглашения не найдены. Создайте первое приглашение, чтобы подключить управляющего.</p>
      </div>

      <div v-else>
        <!-- Desktop Table -->
        <div class="table-wrapper hide-mobile">
          <table class="invitations-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Филиал</th>
                <th>Статус</th>
                <th>Создано</th>
                <th>Срок действия</th>
                <th>Код</th>
                <th class="actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invitation in paginatedInvitations" :key="invitation.id">
                <td>
                  <div class="invitation-name">{{ invitation.firstName }} {{ invitation.lastName }}</div>
                  <div class="invitation-creator">Создано: {{ invitation.createdBy }}</div>
                </td>
                <td>{{ invitation.branchName || "—" }}</td>
                <td>
                  <Badge :variant="getStatusVariant(invitation.status)" size="sm" rounded>
                    {{ statusLabel(invitation.status) }}
                  </Badge>
                  <div v-if="invitation.status === 'used' && invitation.usedByName" class="used-by">Принял: {{ invitation.usedByName }}</div>
                </td>
                <td class="date-cell">{{ formatDate(invitation.createdAt) }}</td>
                <td class="date-cell">{{ formatDate(invitation.expiresAt) }}</td>
                <td>
                  <div class="code-cell">
                    <code class="invitation-code" :title="generateInviteLink(invitation.code)">{{ invitation.code }}</code>
                    <Button size="sm" variant="ghost" @click="copyLink(invitation.code)" icon="clipboard" title="Копировать ссылку"></Button>
                  </div>
                </td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <Button
                      v-if="invitation.status === 'active'"
                      @click="sendToTelegram(invitation)"
                      class="action-btn action-btn-telegram"
                      title="Отправить в Telegram"
                      icon="send"
                    >
                    </Button>
                    <Button
                      v-if="invitation.status === 'active'"
                      @click="openEditModal(invitation)"
                      class="action-btn action-btn-edit"
                      title="Редактировать"
                      icon="pencil"
                    >
                    </Button>
                    <Button
                      v-if="invitation.status === 'active'"
                      @click="openExtendModal(invitation)"
                      class="action-btn action-btn-extend"
                      title="Продлить"
                      icon="clock-3"
                    >
                    </Button>
                    <Button
                      v-if="invitation.status !== 'used'"
                      @click="confirmDelete(invitation)"
                      class="action-btn action-btn-delete"
                      title="Удалить"
                      icon="trash"
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
          <div v-for="invitation in paginatedInvitations" :key="invitation.id" class="invitation-card">
            <div class="invitation-card-header">
              <div>
                <h3 class="invitation-card-name">{{ invitation.firstName }} {{ invitation.lastName }}</h3>
                <p class="invitation-card-creator">Создал: {{ invitation.createdBy }}</p>
              </div>
              <Badge :variant="getStatusVariant(invitation.status)" size="sm" rounded>
                {{ statusLabel(invitation.status) }}
              </Badge>
            </div>

            <div class="invitation-card-body">
              <div class="invitation-card-row">
                <span class="invitation-card-label">Филиал:</span>
                <span class="invitation-card-value">{{ invitation.branchName || "—" }}</span>
              </div>
              <div class="invitation-card-row">
                <span class="invitation-card-label">Создано:</span>
                <span class="invitation-card-value">{{ formatDate(invitation.createdAt) }}</span>
              </div>
              <div class="invitation-card-row">
                <span class="invitation-card-label">Истекает:</span>
                <span class="invitation-card-value">{{ formatDate(invitation.expiresAt) }}</span>
              </div>
              <div class="invitation-card-row">
                <span class="invitation-card-label">Код:</span>
                <code class="invitation-card-code">{{ invitation.code }}</code>
              </div>
              <div v-if="invitation.status === 'used' && invitation.usedByName" class="invitation-card-row">
                <span class="invitation-card-label">Принял:</span>
                <span class="invitation-card-value">{{ invitation.usedByName }}</span>
              </div>
            </div>

            <div class="invitation-card-actions">
              <Button size="sm" variant="secondary" icon="clipboard" @click="copyLink(invitation.code)" fullWidth> Копировать </Button>
              <Button v-if="invitation.status === 'active'" size="sm" variant="secondary" icon="send" @click="sendToTelegram(invitation)" fullWidth>
                В Telegram
              </Button>
              <Button v-if="invitation.status === 'active'" size="sm" variant="secondary" icon="pencil" @click="openEditModal(invitation)" fullWidth>
                Редактировать
              </Button>
              <Button
                v-if="invitation.status === 'active'"
                size="sm"
                variant="secondary"
                icon="clock-3"
                @click="openExtendModal(invitation)"
                fullWidth
              >
                Продлить
              </Button>
              <Button v-if="invitation.status !== 'used'" size="sm" variant="danger" icon="trash" @click="confirmDelete(invitation)" fullWidth>
                Удалить
              </Button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <span class="pagination-info"> Страница {{ pagination.page }} из {{ totalPages }} </span>
          <div class="pagination-buttons">
            <Button size="sm" variant="ghost" :disabled="pagination.page === 1" @click="pagination.page--"> Предыдущая </Button>
            <Button size="sm" variant="ghost" :disabled="pagination.page === totalPages" @click="pagination.page++"> Следующая </Button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Create / Edit Modal -->
    <Modal :show="showFormModal" :title="editingInvitation ? 'Редактировать приглашение' : 'Создать приглашение'" @close="closeFormModal">
      <div class="form-grid">
        <Input v-model="form.firstName" label="Имя" placeholder="Введите имя" required />
        <Input v-model="form.lastName" label="Фамилия" placeholder="Введите фамилию" required />
        <Select v-model.number="form.branchId" label="Филиал" :options="branchSelectOptions" placeholder="Выберите филиал" required />
      </div>
      <p v-if="!editingInvitation" class="modal-hint">
        Срок действия приглашения: {{ defaultExpirationDays }} дней (переменная <code>INVITE_EXPIRATION_DAYS</code> в файле <code>.env</code>)
      </p>
      <template #footer>
        <Button variant="secondary" @click="closeFormModal">Отмена</Button>
        <Button :loading="saving" @click="submitForm">Сохранить</Button>
      </template>
    </Modal>

    <!-- Extend Modal -->
    <Modal v-if="showExtendModal" title="Продлить приглашение" @close="closeExtendModal" size="sm">
      <div class="extend-modal">
        <p class="modal-description">
          Приглашение <strong>{{ editingInvitation?.code }}</strong> истекает {{ formatDate(editingInvitation?.expiresAt) }}. Укажите количество
          дополнительных дней.
        </p>
        <Input
          v-model.number="extendDays"
          type="number"
          label="Продлить на (дней)"
          :placeholder="String(defaultExpirationDays)"
          min="1"
          max="30"
          required
        />
        <p class="modal-hint">
          По умолчанию: {{ defaultExpirationDays }} дней (переменная <code>INVITE_EXPIRATION_DAYS</code> в файле <code>.env</code>)
        </p>
      </div>
      <template #footer>
        <Button variant="secondary" @click="closeExtendModal">Отмена</Button>
        <Button :loading="saving" @click="submitExtend">Продлить</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { listInvitations, createInvitation, updateInvitation, extendInvitation, deleteInvitation } from "../api/invitations";
import { getReferences } from "../api/users";
import Preloader from "../components/ui/Preloader.vue";
import Modal from "../components/ui/Modal.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import { INVITE_EXPIRATION_DAYS, BOT_USERNAME } from "@/env";
import { useToast } from "../composables/useToast";
import { formatBranchLabel } from "../utils/branch";

const loading = ref(false);
const saving = ref(false);

const references = ref({ branches: [] });
const invitations = ref([]);
const DEFAULT_EXPIRATION_FROM_ENV = Number(INVITE_EXPIRATION_DAYS || 7);
const BOT_USERNAME_FROM_ENV = BOT_USERNAME || "your_bot";

const defaultExpirationDays = ref(DEFAULT_EXPIRATION_FROM_ENV);
const botUsername = ref(BOT_USERNAME_FROM_ENV);

const filters = ref({
  search: "",
  status: "",
  branch: "",
});

const pagination = ref({
  page: 1,
  perPage: 10,
});

const showFormModal = ref(false);
const showExtendModal = ref(false);
const editingInvitation = ref(null);

const form = ref({
  firstName: "",
  lastName: "",
  branchId: "",
});

const extendDays = ref(7);
const { showToast } = useToast();

const stats = computed(() => {
  const counters = { total: 0, active: 0, used: 0, expired: 0 };
  invitations.value.forEach((item) => {
    counters.total += 1;
    counters[item.status] += 1;
  });
  return counters;
});

const statusOptions = computed(() => [
  { value: "", label: "Все статусы" },
  { value: "active", label: "Активные" },
  { value: "used", label: "Использованные" },
  { value: "expired", label: "Истёкшие" },
]);

const branchOptions = computed(() => [
  { value: "", label: "Все филиалы" },
  ...references.value.branches.map((b) => ({
    value: String(b.id),
    label: formatBranchLabel(b),
  })),
]);

const branchSelectOptions = computed(() => [
  { value: "", label: "Выберите филиал" },
  ...references.value.branches.map((b) => ({
    value: b.id,
    label: formatBranchLabel(b),
  })),
]);

const processedInvitations = computed(() =>
  invitations.value.map((item) => ({
    ...item,
    searchable: [item.firstName, item.lastName, item.branchName, item.code].filter(Boolean).join(" ").toLowerCase(),
  }))
);

const filteredInvitations = computed(() => {
  const search = filters.value.search.trim().toLowerCase();
  return processedInvitations.value.filter((item) => {
    const matchSearch = search ? item.searchable.includes(search) : true;
    const matchStatus = filters.value.status ? item.status === filters.value.status : true;
    const matchBranch = filters.value.branch ? String(item.branchId) === filters.value.branch : true;
    return matchSearch && matchStatus && matchBranch;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredInvitations.value.length / pagination.value.perPage)));

const paginatedInvitations = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.perPage;
  return filteredInvitations.value.slice(start, start + pagination.value.perPage);
});

watch(
  () => [filters.value.search, filters.value.status, filters.value.branch],
  () => {
    pagination.value.page = 1;
  }
);

const loadData = async () => {
  loading.value = true;
  try {
    const [invitationsResponse, referencesData] = await Promise.all([listInvitations(), getReferences()]);

    references.value = referencesData || { branches: [] };
    invitations.value = (invitationsResponse.data?.invitations || []).map(normalizeInvitation);

    // Значения по умолчанию берём из переменных окружения сборки
    defaultExpirationDays.value = DEFAULT_EXPIRATION_FROM_ENV;
    botUsername.value = BOT_USERNAME_FROM_ENV;
  } catch (error) {
    console.error("Ошибка загрузки приглашений", error);
    invitations.value = [];
  } finally {
    loading.value = false;
  }
};

const normalizeInvitation = (item) => {
  const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
  const usedAt = item.used_at ? new Date(item.used_at) : null;
  const status = item.used_by ? "used" : expiresAt && expiresAt.getTime() < Date.now() ? "expired" : "active";

  return {
    id: item.id,
    code: item.code,
    firstName: item.first_name,
    lastName: item.last_name,
    branchId: item.branch_id,
    branchName: formatBranchLabel({ name: item.branch_name || "", city: item.branch_city || "" }) || item.branch_name,
    createdAt: item.created_at ? new Date(item.created_at) : null,
    expiresAt,
    usedAt,
    usedBy: item.used_by,
    usedByName: item.used_by_name,
    createdBy: item.created_by_name || "Вы",
    status,
  };
};

const openCreateModal = () => {
  editingInvitation.value = null;
  form.value = {
    firstName: "",
    lastName: "",
    branchId: "",
  };
  showFormModal.value = true;
};

const openEditModal = (invitation) => {
  editingInvitation.value = invitation;
  form.value = {
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    branchId: invitation.branchId,
  };
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  saving.value = false;
};

const submitForm = async () => {
  if (!form.value.firstName.trim() || !form.value.lastName.trim() || !form.value.branchId) {
    showToast("Заполните все обязательные поля", "warning");
    return;
  }

  saving.value = true;
  try {
    if (editingInvitation.value) {
      const { data } = await updateInvitation(editingInvitation.value.id, {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        branchId: form.value.branchId,
      });
      updateList(data?.invitation);
      showToast("Приглашение обновлено", "success");
    } else {
      const { data } = await createInvitation({
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        branchId: form.value.branchId,
      });
      if (data?.invitation) {
        invitations.value.unshift(normalizeInvitation(data.invitation));
        showToast("Приглашение создано. Ссылка скопирована в буфер обмена.", "success");
        copyLink(data.invitation.code);
      }
    }
    closeFormModal();
  } catch (error) {
    console.error("Ошибка сохранения приглашения", error);
    showToast(error.response?.data?.error || "Не удалось сохранить приглашение", "error");
  } finally {
    saving.value = false;
  }
};

const updateList = (rawInvitation) => {
  if (!rawInvitation) return;
  const normalized = normalizeInvitation(rawInvitation);
  const index = invitations.value.findIndex((item) => item.id === normalized.id);
  if (index === -1) {
    invitations.value.unshift(normalized);
  } else {
    invitations.value.splice(index, 1, normalized);
  }
};

const openExtendModal = (invitation) => {
  editingInvitation.value = invitation;
  extendDays.value = defaultExpirationDays.value; // Используем значение из настроек
  showExtendModal.value = true;
};

const closeExtendModal = () => {
  showExtendModal.value = false;
  saving.value = false;
};

const submitExtend = async () => {
  if (extendDays.value < 1 || extendDays.value > 30) {
    showToast("Количество дней должно быть от 1 до 30", "warning");
    return;
  }

  saving.value = true;
  try {
    const { data } = await extendInvitation(editingInvitation.value.id, { days: extendDays.value });
    updateList(data?.invitation);
    showToast("Срок действия приглашения продлён", "success");
    closeExtendModal();
  } catch (error) {
    console.error("Ошибка продления приглашения", error);
    showToast(error.response?.data?.error || "Не удалось продлить приглашение", "error");
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (invitation) => {
  if (invitation.status === "used") {
    showToast("Нельзя удалить использованное приглашение", "warning");
    return;
  }

  if (!window.confirm(`Удалить приглашение ${invitation.code}?`)) {
    return;
  }

  try {
    await deleteInvitation(invitation.id);
    invitations.value = invitations.value.filter((item) => item.id !== invitation.id);
    showToast("Приглашение удалено", "success");
  } catch (error) {
    console.error("Ошибка удаления приглашения", error);
    showToast(error.response?.data?.error || "Не удалось удалить приглашение", "error");
  }
};

const statusLabel = (status) => {
  const labels = {
    active: "Активно",
    used: "Использовано",
    expired: "Истекло",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    active: "success",
    used: "primary",
    expired: "danger",
  };
  return variants[status] || "default";
};

const statusBadgeClass = (status) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "used":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "expired":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300";
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const generateInviteLink = (code) => {
  return `https://t.me/${botUsername.value}?startapp=invite_${code}`;
};

const copyLink = async (code) => {
  const link = generateInviteLink(code);
  try {
    await navigator.clipboard.writeText(link);
  } catch (error) {
    console.error("Clipboard error", error);
    const textArea = document.createElement("textarea");
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
  showToast("Ссылка приглашения скопирована", "info");
};

const sendToTelegram = (invitation) => {
  const link = generateInviteLink(invitation.code);
  const message = `Приглашение для ${invitation.firstName} ${invitation.lastName}\nФилиал: ${invitation.branchName}\n\nПерейдите по ссылке для регистрации:\n${link}`;

  // Открываем Telegram Web с предзаполненным сообщением
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    `Приглашение для ${invitation.firstName} ${invitation.lastName} (${invitation.branchName})`
  )}`;
  window.open(telegramUrl, "_blank");
};

onMounted(loadData);
</script>

<style scoped>
.invitations-view {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.page-stats {
  font-size: 14px;
  color: var(--text-secondary);
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
  grid-template-columns: 2fr 1fr 1fr;
  gap: 8px;
}

.invitations-card {
  overflow: visible;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.invitations-table {
  width: 100%;
  border-collapse: collapse;
}

.invitations-table thead {
  border-bottom: 1px solid var(--divider);
}

.invitations-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.invitations-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.2s ease;
}

.invitations-table td {
  padding: 16px;
  font-size: 15px;
  color: var(--text-primary);
}

.invitation-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.invitation-creator {
  font-size: 14px;
  color: var(--text-secondary);
}

.used-by {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.date-cell {
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
}

.code-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invitation-code {
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--accent-blue-soft);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: "Courier New", monospace;
  cursor: help;
  transition: background-color 0.2s;
}

.invitation-code:hover {
  background-color: var(--accent-blue);
  color: white;
}

.copy-btn {
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
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

.action-btn-telegram:hover {
  background-color: #0088cc1f;
}

.action-btn-edit:hover {
  background-color: var(--accent-blue-soft);
}

.action-btn-extend:hover {
  background-color: var(--accent-purple-soft);
}

.action-btn-delete:hover {
  background-color: #ff3b301f;
}

.action-btn-telegram {
  color: rgb(0, 136, 204);
}

.action-btn-edit {
  color: var(--accent-blue);
}

.action-btn-extend {
  color: var(--accent-purple);
}

.action-btn-delete {
  color: #ff3b30;
}

/* Mobile Cards */
.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.invitation-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--divider);
}

.invitation-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
}

.invitation-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.invitation-card-creator {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.invitation-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.invitation-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.invitation-card-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.invitation-card-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
}

.invitation-card-code {
  font-size: 13px;
  color: var(--text-primary);
  background-color: var(--accent-blue-soft);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: "Courier New", monospace;
}

.invitation-card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--divider);
}

.pagination-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.pagination-buttons {
  display: flex;
  gap: 8px;
}

/* Modals */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid > *:last-child {
  grid-column: 1 / -1;
}

.extend-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-description {
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.modal-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
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

  .invitation-card-actions {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .pagination-buttons {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
