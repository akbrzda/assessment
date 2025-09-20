<template>
  <div class="panel">
    <InfoCard title="Пригласительные ссылки">
      <div class="create-block">
        <p class="hint">
          Приглашение выдаёт роль управляющего и действует {{ inviteDays }} дней. Используйте кнопку, чтобы заполнить данные и получить ссылку.
        </p>
        <button class="primary-button" type="button" @click="openCreateModal">Создать приглашение</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </InfoCard>

    <InfoCard title="Активные приглашения">
      <LoadingState v-if="invitationsStore.isLoading" />
      <template v-else>
        <div class="filters">
          <button type="button" class="filter-chip" :class="{ 'filter-chip--active': statusFilter === 'all' }" @click="statusFilter = 'all'">
            Все
          </button>
          <button type="button" class="filter-chip" :class="{ 'filter-chip--active': statusFilter === 'active' }" @click="statusFilter = 'active'">
            Активные
          </button>
          <button type="button" class="filter-chip" :class="{ 'filter-chip--active': statusFilter === 'used' }" @click="statusFilter = 'used'">
            Использованные
          </button>
          <button type="button" class="filter-chip" :class="{ 'filter-chip--active': statusFilter === 'expired' }" @click="statusFilter = 'expired'">
            Истёкшие
          </button>
        </div>

        <p v-if="!filteredInvitations.length" class="hint">Приглашения не найдены по выбранному фильтру.</p>
        <ul v-else class="invite-list">
          <li v-for="invite in filteredInvitations" :key="invite.id" class="invite-item">
            <div class="invite-item__content">
              <div class="invite-item__info">
                <div class="invite-item__code">
                  <span class="invite-item__label">Код</span>
                  <span class="invite-item__value">{{ invite.code }}</span>
                </div>
                <div class="invite-item__details">
                  <span class="invite-item__name"> {{ invite.first_name }} {{ invite.last_name }} </span>
                  <span>Филиал: {{ invite.branch_name || "—" }}</span>
                  <span>Истекает: {{ formatDate(invite.expires_at) }}</span>
                  <span v-if="invite.used_by" class="invite-item__used">
                    Использовано: {{ formatDate(invite.used_at) }} · {{ invite.used_by_name || "—" }}
                  </span>
                </div>
              </div>
              <div class="invite-item__actions">
                <button class="secondary-button" type="button" :disabled="isExtendDisabled(invite)" @click="handleExtend(invite.id)">
                  <span v-if="isExtending(invite.id)" class="button-loader" />
                  {{ isExtending(invite.id) ? "Продлеваем…" : "Продлить 7 дней" }}
                </button>
                <button class="primary-button" type="button" @click="copyLink(invite)">🔗 Скопировать ссылку</button>
                <button class="danger-button" type="button" :disabled="isDeleteDisabled(invite)" @click="handleDelete(invite.id)">
                  <span v-if="isDeleting(invite.id)" class="button-loader" />
                  {{ isDeleting(invite.id) ? "Удаляем…" : "Удалить" }}
                </button>
              </div>
            </div>
          </li>
        </ul>
      </template>
    </InfoCard>
  </div>
  <ModalDialog v-model="isCreateModalOpen" title="Создание ссылки">
    <form class="form" @submit.prevent="handleCreate">
      <label class="form__field">
        <span>Имя</span>
        <BaseInput v-model="form.firstName" placeholder="Ивано" autocomplete="off" />
      </label>
      <label class="form__field">
        <span>Фамилия</span>
        <BaseInput v-model="form.lastName" placeholder="Иванов" autocomplete="off" />
      </label>
      <label class="form__field">
        <span>Филиал</span>
        <BaseSelect v-model.number="form.branchId">
          <option value="" disabled>Выберите филиал</option>
          <option v-for="branch in branches" :key="branch.id" :value="branch.id">
            {{ branch.name }}
          </option>
        </BaseSelect>
      </label>
    </form>
    <template #footer>
      <button class="secondary-button" type="button" @click="closeCreateModal">Отмена</button>
      <button class="primary-button" type="button" :disabled="createDisabled" @click="handleCreate">
        <span v-if="isCreating" class="button-loader" />
        {{ isCreating ? "Создаем…" : "Сохранить" }}
      </button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from "vue";
import InfoCard from "../InfoCard.vue";
import LoadingState from "../LoadingState.vue";
import { useAppStore } from "../../store/appStore";
import { useInvitationsStore } from "../../store/invitationsStore";
import { showAlert, hapticImpact } from "../../services/telegram";
import ModalDialog from "../common/ModalDialog.vue";
import BaseInput from "../common/BaseInput.vue";
import BaseSelect from "../common/BaseSelect.vue";

const appStore = useAppStore();
const invitationsStore = useInvitationsStore();

const botUsername = import.meta.env.VITE_BOT_USERNAME || "";

const form = reactive({
  firstName: "",
  lastName: "",
  branchId: "",
});

const branches = computed(() => appStore.references.branches || []);
const invitations = computed(() => invitationsStore.invitations || []);
const error = computed(() => invitationsStore.error);
const statusFilter = ref("all");
const isCreateModalOpen = ref(false);

const inviteDays = computed(() => {
  const days = Number(import.meta.env.VITE_INVITE_EXPIRATION_DAYS);
  return Number.isFinite(days) && days > 0 ? days : 7;
});

const isCreating = computed(() => invitationsStore.pendingAction === "create" && invitationsStore.isSubmitting);

const createDisabled = computed(() => isCreating.value || !form.firstName.trim() || !form.lastName.trim() || !form.branchId);

const filteredInvitations = computed(() => {
  const list = invitations.value;
  const now = Date.now();
  switch (statusFilter.value) {
    case "active":
      return list.filter((invite) => !invite.used_by && new Date(invite.expires_at).getTime() >= now);
    case "used":
      return list.filter((invite) => Boolean(invite.used_by));
    case "expired":
      return list.filter((invite) => !invite.used_by && new Date(invite.expires_at).getTime() < now);
    default:
      return list;
  }
});

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }
  return new Date(dateString).toLocaleString("ru-RU");
}

function buildInviteLink(code) {
  if (botUsername) {
    return `https://t.me/${botUsername}?startapp=${code}`;
  }
  return code;
}

async function copyLink(invite) {
  const link = buildInviteLink(invite.code);
  try {
    await navigator.clipboard.writeText(link);
    hapticImpact("light");
    showAlert("Ссылка скопирована");
  } catch (error) {
    showAlert("Не удалось скопировать ссылку");
  }
}

function openCreateModal() {
  resetForm();
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  if (isCreating.value) {
    return;
  }
  isCreateModalOpen.value = false;
}

function resetForm() {
  form.firstName = "";
  form.lastName = "";
  form.branchId = "";
}

async function handleCreate() {
  if (createDisabled.value) {
    return;
  }
  try {
    await invitationsStore.createInvitation({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      branchId: Number(form.branchId),
    });
    resetForm();
    closeCreateModal();
    hapticImpact("light");
  } catch (error) {
    showAlert(error.message || "Не удалось создать приглашение");
  }
}

function isExtending(id) {
  return invitationsStore.pendingAction === "extend" && invitationsStore.pendingId === id && invitationsStore.isSubmitting;
}

function isDeleting(id) {
  return invitationsStore.pendingAction === "delete" && invitationsStore.pendingId === id && invitationsStore.isSubmitting;
}

function isExtendDisabled(invite) {
  return Boolean(invite.used_by) || isExtending(invite.id) || isDeleting(invite.id);
}

function isDeleteDisabled(invite) {
  return Boolean(invite.used_by) || isDeleting(invite.id) || isExtending(invite.id);
}

async function handleExtend(id) {
  try {
    await invitationsStore.extendInvitation(id, { days: 7 });
    hapticImpact("medium");
  } catch (error) {
    showAlert(error.message || "Не удалось продлить приглашение");
  }
}

async function handleDelete(id) {
  try {
    await invitationsStore.deleteInvitation(id);
    hapticImpact("light");
  } catch (error) {
    showAlert(error.message || "Не удалось удалить приглашение");
  }
}

onMounted(async () => {
  try {
    if (!appStore.references.branches?.length) {
      await appStore.loadReferences();
    }
    if (!invitationsStore.invitations.length && !invitationsStore.isLoading) {
      await invitationsStore.fetchInvitations();
    }
  } catch (error) {
    showAlert(error.message || "Не удалось загрузить приглашения");
  }
});
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.create-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.primary-button,
.secondary-button,
.danger-button {
  border-radius: 12px;
  border: none;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.primary-button {
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.secondary-button {
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  color: var(--tg-theme-text-color, #0a0a0a);
}

.danger-button {
  background: #ef4343;
  color: #ffffff;
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-loader {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: spin 0.8s linear infinite;
}

.secondary-button .button-loader {
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: rgba(0, 0, 0, 0.55);
}

.danger-button .button-loader {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: rgba(255, 255, 255, 0.9);
}

.invite-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invite-item {
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--tg-theme-bg-color, #ffffff);
  padding: 14px;
}

.invite-item__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invite-item__info {
  display: flex;
  gap: 16px;
}

.invite-item__code {
  min-width: 80px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invite-item__label {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.invite-item__value {
  font-size: 18px;
  font-weight: 700;
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.invite-item__details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.invite-item__name {
  font-weight: 600;
}

.invite-item__used {
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.invite-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hint {
  margin: 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.filters::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  color: var(--tg-theme-hint-color, #6f7a8b);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  flex: 0 0 auto;
}

.filter-chip--active {
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.error {
  color: #d62d30;
  font-size: 13px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
