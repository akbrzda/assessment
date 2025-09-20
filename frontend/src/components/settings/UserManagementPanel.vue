<template>
  <div class="panel">
    <InfoCard title="Пользователи">
      <LoadingState v-if="usersStore.isLoading" />
      <template v-else>
        <p v-if="usersStore.error" class="error">{{ usersStore.error }}</p>
        <div class="toolbar">
          <BaseInput
            v-model="search"
            type="search"
            placeholder="Поиск по имени или филиалу"
            class="toolbar__search"
          />
        </div>
        <p v-if="filteredUsers.length === 0" class="hint">Пользователи не найдены.</p>
        <ul v-else class="user-list">
          <li v-for="user in filteredUsers" :key="user.id" class="user-item">
            <div class="user-item__header">
              <div class="user-item__info">
                <div class="user-item__name">{{ user.firstName }} {{ user.lastName }}</div>
                <div class="user-item__meta">
                  <span>Роль: {{ roleDisplay(user.roleName) }}</span>
                  <span>Должность: {{ user.positionName }}</span>
                  <span>Филиал: {{ user.branchName }}</span>
                </div>
              </div>
            </div>

            <div v-if="editingId === user.id" class="user-item__form">
              <div class="form-grid">
                <label class="form-field">
                  <span>Имя</span>
                  <BaseInput v-model="form.firstName" />
                </label>
                <label class="form-field">
                  <span>Фамилия</span>
                  <BaseInput v-model="form.lastName" />
                </label>
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>Должность</span>
                  <BaseSelect v-model.number="form.positionId">
                    <option v-for="position in positions" :key="position.id" :value="position.id">
                      {{ position.name }}
                    </option>
                  </BaseSelect>
                </label>
                <label class="form-field">
                  <span>Филиал</span>
                  <BaseSelect v-model.number="form.branchId">
                    <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                      {{ branch.name }}
                    </option>
                  </BaseSelect>
                </label>
              </div>
              <label class="form-field">
                <span>Роль</span>
                <BaseSelect v-model.number="form.roleId">
                  <option v-for="role in roleOptions" :key="role.id" :value="role.id">
                    {{ role.label }}
                  </option>
                </BaseSelect>
              </label>
              <div class="form-grid">
                <label class="form-field">
                  <span>Уровень</span>
                  <BaseInput v-model.number="form.level" type="number" min="1" />
                </label>
                <label class="form-field">
                  <span>Очки</span>
                  <BaseInput v-model.number="form.points" type="number" min="0" />
                </label>
              </div>

              <div class="actions">
                <button
                  class="primary-button"
                  type="button"
                  :disabled="isUpdating(user.id)"
                  @click="handleSave(user.id)"
                >
                  <span v-if="isUpdating(user.id)" class="button-loader" />
                  {{ isUpdating(user.id) ? 'Сохраняем…' : 'Сохранить' }}
                </button>
                <button class="secondary-button" type="button" @click="cancelEdit">Отмена</button>
              </div>
            </div>
            <div v-else class="user-item__actions">
              <button class="primary-button" type="button" @click="startEdit(user)">Редактировать</button>
              <button
                class="danger-button"
                type="button"
                :disabled="user.id === currentUserId || isDeleting(user.id)"
                @click="handleDelete(user.id)"
              >
                <span v-if="isDeleting(user.id)" class="button-loader" />
                {{ isDeleting(user.id) ? 'Удаляем…' : 'Удалить' }}
              </button>
            </div>
          </li>
        </ul>
      </template>
    </InfoCard>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import InfoCard from '../InfoCard.vue';
import LoadingState from '../LoadingState.vue';
import BaseInput from '../common/BaseInput.vue';
import BaseSelect from '../common/BaseSelect.vue';
import { useUsersStore } from '../../store/usersStore';
import { useAppStore } from '../../store/appStore';
import { showAlert, showConfirm, hapticImpact } from '../../services/telegram';

const usersStore = useUsersStore();
const appStore = useAppStore();

const search = ref('');
const editingId = ref(null);
const form = reactive({
  firstName: '',
  lastName: '',
  positionId: '',
  branchId: '',
  roleId: '',
  level: 1,
  points: 0
});

const branches = computed(() => appStore.references.branches || []);
const positions = computed(() => appStore.references.positions || []);
const roles = computed(() => appStore.references.roles || []);

const roleDisplay = (name) => {
  switch ((name || '').toLowerCase()) {
    case 'manager':
      return 'Управляющий';
    case 'superadmin':
      return 'Суперадмин';
    case 'employee':
      return 'Сотрудник';
    default:
      return name;
  }
};

const roleOptions = computed(() => roles.value.map((role) => ({ ...role, label: roleDisplay(role.name) })));
const currentUserId = computed(() => appStore.user?.id);

const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) {
    return usersStore.users;
  }
  return usersStore.users.filter((user) => {
    const text = `${user.firstName} ${user.lastName} ${user.branchName}`.toLowerCase();
    return text.includes(query);
  });
});

function startEdit(user) {
  editingId.value = user.id;
  form.firstName = user.firstName;
  form.lastName = user.lastName;
  form.positionId = user.positionId;
  form.branchId = user.branchId;
  form.roleId = user.roleId;
  form.level = user.level;
  form.points = user.points;
}

function cancelEdit() {
  editingId.value = null;
}

async function handleSave(id) {
  try {
    await usersStore.updateUser(id, {
      firstName: form.firstName,
      lastName: form.lastName,
      positionId: Number(form.positionId),
      branchId: Number(form.branchId),
      roleId: Number(form.roleId),
      level: Number(form.level),
      points: Number(form.points)
    });
    editingId.value = null;
    hapticImpact('light');
  } catch (error) {
    showAlert(error.message || 'Не удалось обновить пользователя');
  }
}

async function handleDelete(id) {
  const confirmed = await showConfirm('Удалить пользователя? Это действие необратимо.');
  if (!confirmed) {
    return;
  }
  try {
    await usersStore.deleteUser(id);
    hapticImpact('medium');
  } catch (error) {
    showAlert(error.message || 'Не удалось удалить пользователя');
  }
}

function isUpdating(id) {
  return (
    usersStore.pendingAction === 'update' &&
    usersStore.pendingId === id &&
    usersStore.isSubmitting
  );
}

function isDeleting(id) {
  return (
    usersStore.pendingAction === 'delete' &&
    usersStore.pendingId === id &&
    usersStore.isSubmitting
  );
}

onMounted(async () => {
  try {
    if (!appStore.references.branches?.length) {
      await appStore.loadReferences();
    }
    if (!usersStore.users.length) {
      await usersStore.fetchUsers();
    }
  } catch (error) {
    showAlert(error.message || 'Не удалось загрузить пользователей');
  }
});
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toolbar__search {
  flex: 1;
  min-width: 0;
}

.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-item {
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--tg-theme-bg-color, #ffffff);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item__header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.user-item__badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.16), rgba(10, 132, 255, 0.36));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #ffffff;
  font-size: 18px;
}

.user-item__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-item__name {
  font-weight: 600;
  font-size: 16px;
}

.user-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.user-item__actions,
.user-item__form .actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.form-field :deep(.base-control) {
  width: 100%;
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

.hint {
  margin: 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 14px;
}

.error {
  color: #d62d30;
  font-size: 13px;
  margin-bottom: 8px;
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
