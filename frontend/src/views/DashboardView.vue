<template>
  <PageContainer title="Добро пожаловать" :subtitle="userName">
    <LoadingState v-if="isLoading" />
    <InfoCard v-else-if="participationAllowed" title="Ваш прогресс">
      <div class="progress">
        <div>
          <span class="progress__label">Уровень</span>
          <span class="progress__value">{{ level }}</span>
        </div>
        <div>
          <span class="progress__label">Очки</span>
          <span class="progress__value">{{ points }}</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__inner" :style="progressStyle" />
      </div>
      <p class="hint">{{ nextLevelHint }}</p>
      <div class="stats">
        <div>
          <span class="stats__label">Стрик</span>
          <span class="stats__value">{{ streakText }}</span>
        </div>
        <div>
          <span class="stats__label">Очки за месяц</span>
          <span class="stats__value">{{ monthlyPoints }}</span>
        </div>
      </div>
    </InfoCard>
    <InfoCard v-else title="Геймификация">
      <p class="hint">Игровые элементы доступны только сотрудникам. Вы можете контролировать их прогресс и награды из других разделов.</p>
    </InfoCard>

    <InfoCard title="Ближайшие действия">
      <ul class="todo">
        <li>Следите за новыми аттестациями — раздел откроется на втором этапе.</li>
        <li>Проверяйте прогресс коллег в лидербордах, как только появятся данные.</li>
        <li>Дополняйте профиль, чтобы управляющий видел актуальную информацию.</li>
      </ul>
    </InfoCard>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import LoadingState from '../components/LoadingState.vue';
import { useAppStore } from '../store/appStore';
import { useGamificationStore } from '../store/gamificationStore';

const appStore = useAppStore();
const { user } = storeToRefs(appStore);
const gamificationStore = useGamificationStore();

const isLoading = computed(
  () => (appStore.isLoading && !appStore.user) || gamificationStore.isLoading
);

const participationAllowed = computed(() => gamificationStore.participationAllowed);

const userName = computed(() => {
  if (!user.value) {
    return 'Пройдите регистрацию';
  }
  return `${user.value.firstName} ${user.value.lastName}`;
});

const progressStyle = computed(() => {
  const percent = gamificationStore.progressPercent;
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(percent, 100)) : 0;
  return { width: `${safePercent}%` };
});

const nextLevelHint = computed(() => {
  const nextLevel = gamificationStore.nextLevel;
  if (!nextLevel) {
    return 'Максимальный уровень достигнут';
  }
  return `До ${nextLevel.name}: ещё ${nextLevel.pointsToReach} очков`;
});

const streakText = computed(() => {
  const stats = gamificationStore.overview?.stats;
  const current = stats?.currentStreak || 0;
  const longest = stats?.longestStreak || 0;
  if (!current && !longest) {
    return 'нет серии';
  }
  if (current) {
    return `${current} подряд (макс. ${longest})`;
  }
  return `макс. серия ${longest}`;
});

const monthlyPoints = computed(() => gamificationStore.overview?.monthlyPoints || 0);

const points = computed(() => gamificationStore.userPoints || user.value?.points || 0);
const level = computed(() => gamificationStore.userLevel || user.value?.level || 1);

onMounted(() => {
  if (appStore.isAuthenticated) {
    appStore.refreshProfile();
    gamificationStore.loadOverview().catch(() => {});
  }
});
</script>

<style scoped>
.progress {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.progress__label {
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 12px;
}

.progress__value {
  font-size: 20px;
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar__inner {
  height: 100%;
  background: var(--tg-theme-button-color, #0a84ff);
  transition: width 0.3s ease;
}

.hint {
  margin: 0;
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 13px;
}

.stats {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stats__label {
  color: var(--tg-theme-hint-color, #6f7a8b);
  font-size: 12px;
}

.stats__value {
  font-size: 16px;
  font-weight: 600;
}

.todo {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--tg-theme-text-color, #0a0a0a);
}

.todo li {
  font-size: 14px;
}
</style>
