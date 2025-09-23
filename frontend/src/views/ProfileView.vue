<template>
  <PageContainer title="Профиль" subtitle="Личные данные">
    <div class="profile-header">
      <AvatarCircle :avatar-url="avatarUrl" :first-name="profileUser.firstName" :last-name="profileUser.lastName" :size="72" />
      <div class="profile-header__text">
        <h2 class="profile-header__name">{{ fullName }}</h2>
        <span class="profile-header__role">{{ roleLabel }}</span>
      </div>
    </div>

    <InfoCard title="Основная информация">
      <div class="info-row">
        <span class="info-label">ФИО</span>
        <span v-if="!isEditing" class="info-value">{{ fullName }}</span>
        <div v-else class="edit-group">
          <label class="edit-field">
            <span class="edit-field__label">Имя</span>
            <BaseInput v-model="form.firstName" placeholder="Имя" />
          </label>
          <label class="edit-field">
            <span class="edit-field__label">Фамилия</span>
            <BaseInput v-model="form.lastName" placeholder="Фамилия" />
          </label>
        </div>
      </div>
      <div class="info-row">
        <span class="info-label">Должность</span>
        <span class="info-value">{{ user?.positionName }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Филиал</span>
        <span class="info-value">{{ user?.branchName }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Роль</span>
        <span class="info-value">{{ roleLabel }}</span>
      </div>
      <button v-if="!isEditing" class="edit-button" type="button" @click="startEdit">
        Редактировать
      </button>
    </InfoCard>

    <InfoCard v-if="participationAllowed" title="Статистика">
      <div class="stats">
        <div class="stats__item">
          <span class="stats__label">Уровень</span>
          <span class="stats__value">{{ gamificationStore.userLevel || user?.level }}</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Очки</span>
          <span class="stats__value">{{ gamificationStore.userPoints || user?.points }}</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Текущая серия</span>
          <span class="stats__value">{{ gamificationStore.overview?.stats?.currentStreak || 0 }}</span>
        </div>
        <div class="stats__item">
          <span class="stats__label">Максимальная серия</span>
          <span class="stats__value">{{ gamificationStore.overview?.stats?.longestStreak || 0 }}</span>
        </div>
      </div>
    </InfoCard>
    <InfoCard v-else title="Статистика">
      <p class="hint">Геймификация и накопление очков доступны только сотрудникам. Вы можете управлять наградами и видеть информацию коллег через админ-панель.</p>
    </InfoCard>

    <InfoCard title="Бейджи">
      <div v-if="participationAllowed && badges.length" class="badges">
        <div
          v-for="badge in badges"
          :key="badge.code"
          class="badge"
          :class="{ 'badge--locked': !badge.earned }"
        >
          <span class="badge__icon">{{ badge.icon || (badge.earned ? '🎖' : '⬜️') }}</span>
          <div class="badge__info">
            <span class="badge__name">{{ badge.name }}</span>
            <span class="badge__desc">{{ badge.description }}</span>
            <span v-if="badge.earned && badge.awardedAt" class="badge__date">
              Получен {{ formatAwardDate(badge.awardedAt) }}
            </span>
            <span v-else class="badge__date badge__date--muted">Пока не получен</span>
          </div>
        </div>
      </div>
      <p v-else-if="participationAllowed" class="hint">Первые награды появятся после прохождения аттестаций.</p>
      <p v-else class="hint">Бейджи начисляются только сотрудникам. Используйте админ-панель, чтобы управлять наградами для команды.</p>
    </InfoCard>

    <InfoCard v-if="isSuperAdmin" title="Администрирование">
      <div class="admin-actions">
        <button class="primary-button" type="button" @click="goToSettings">
          Настройки
        </button>
      </div>
    </InfoCard>
  </PageContainer>
</template>

<script setup>
import { computed, reactive, ref, watch, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import AvatarCircle from '../components/common/AvatarCircle.vue';
import { useAppStore } from '../store/appStore';
import { useGamificationStore } from '../store/gamificationStore';
import {
  setMainButton,
  hideMainButton,
  showAlert,
  showBackButton,
  showMainButtonProgress,
  hideMainButtonProgress
} from '../services/telegram';
import BaseInput from '../components/common/BaseInput.vue';

const appStore = useAppStore();
const gamificationStore = useGamificationStore();
const user = computed(() => appStore.user);
const router = useRouter();

const defaults = computed(() => appStore.defaults || {});

const form = reactive({
  firstName: user.value?.firstName || '',
  lastName: user.value?.lastName || ''
});

const isEditing = ref(false);
const isSaving = ref(false);
let cleanupButton = () => {};
let cleanupBack = () => {};

const isSuperAdmin = computed(() => appStore.isSuperAdmin);
const avatarUrl = computed(() => user.value?.avatarUrl || defaults.value?.avatarUrl);
const profileUser = computed(() => ({
  firstName: user.value?.firstName || defaults.value?.firstName || '',
  lastName: user.value?.lastName || defaults.value?.lastName || ''
}));

const participationAllowed = computed(() => gamificationStore.participationAllowed);

const fullName = computed(() => {
  const first = user.value?.firstName || defaults.value?.firstName || '';
  const last = user.value?.lastName || defaults.value?.lastName || '';
  return `${first} ${last}`.trim();
});
const roleLabel = computed(() => {
  switch (user.value?.roleName) {
    case 'superadmin':
      return 'Суперадмин';
    case 'manager':
      return 'Управляющий';
    default:
      return 'Сотрудник';
  }
});

const badges = computed(() => gamificationStore.overview?.badges || []);
const hasBadges = computed(() => badges.value.some((badge) => badge.earned));

function formatAwardDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function startEdit() {
  form.firstName = user.value?.firstName || '';
  form.lastName = user.value?.lastName || '';
  isEditing.value = true;
  isSaving.value = false;
  syncActionButton();
  cleanupBack = showBackButton(cancelEdit);
}

function cancelEdit() {
  isEditing.value = false;
  isSaving.value = false;
  hideMainButtonProgress();
  cleanupButton();
  cleanupBack();
  hideMainButton();
}

async function saveProfile() {
  if (!form.firstName || form.firstName.length < 2) {
    showAlert('Введите корректное имя');
    return;
  }
  if (!form.lastName || form.lastName.length < 2) {
    showAlert('Введите корректную фамилию');
    return;
  }
  if (isSaving.value) {
    return;
  }
  isSaving.value = true;
  syncActionButton();
  try {
    await appStore.updateProfile({
      firstName: form.firstName,
      lastName: form.lastName
    });
    hideMainButtonProgress();
    isSaving.value = false;
    cancelEdit();
  } catch (error) {
    showAlert(error.message || 'Не удалось сохранить');
    isSaving.value = false;
    hideMainButtonProgress();
    if (isEditing.value) {
      syncActionButton();
    }
  }
}

function syncActionButton() {
  cleanupButton();
  if (!isEditing.value) {
    cleanupButton = () => {};
    return;
  }
  cleanupButton = setMainButton({
    text: isSaving.value ? 'Сохраняем...' : 'Сохранить',
    isVisible: true,
    onClick: saveProfile
  });
  if (isSaving.value) {
    showMainButtonProgress();
  } else {
    hideMainButtonProgress();
  }
}

watch(
  () => user.value,
  (newUser) => {
    if (newUser && !isEditing.value) {
      form.firstName = newUser.firstName;
      form.lastName = newUser.lastName;
    }
  }
);

watch(isEditing, (editing) => {
  if (!editing) {
    return;
  }
  syncActionButton();
});

function goToSettings() {
  router.push({ name: 'settings' });
}

onBeforeUnmount(() => {
  cleanupButton();
  cleanupBack();
  hideMainButton();
  hideMainButtonProgress();
});

onMounted(() => {
  if (appStore.isAuthenticated) {
    gamificationStore.loadOverview().catch(() => {});
  }
});
</script>

<style scoped>
.info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.info-value {
  font-size: 16px;
  font-weight: 600;
}

.edit-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-field__label {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.edit-group :deep(.base-control) {
  border-radius: 10px;
  font-size: 15px;
}

.edit-button {
  margin-top: 12px;
  align-self: flex-start;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.stats {
  display: flex;
  gap: 16px;
}

.stats__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats__label {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.stats__value {
  font-size: 18px;
  font-weight: 700;
}

.badges {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.badge {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  background: var(--tg-theme-bg-color, #ffffff);
}

.badge--locked {
  opacity: 0.65;
}

.badge__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.badge__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.badge__name {
  font-size: 16px;
  font-weight: 600;
}

.badge__desc {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.badge__date {
  font-size: 12px;
  color: var(--tg-theme-link-color, #0a84ff);
}

.badge__date--muted {
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.hint {
  margin: 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 14px;
}

.admin-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.primary-button {
  border-radius: 12px;
  border: none;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: var(--tg-theme-button-color, #0a84ff);
  color: var(--tg-theme-button-text-color, #ffffff);
  transition: opacity 0.2s ease;
}

.primary-button:active {
  opacity: 0.85;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.profile-header__text h2 {
  margin: 0;
  font-size: 20px;
}

.profile-header__role {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}
</style>
