<template>
  <PageContainer title="Добро пожаловать" :subtitle="userName">
    <LoadingState v-if="appStore.isLoading && !appStore.user" />
    <InfoCard v-else title="Ваш прогресс">
      <div class="progress">
        <div>
          <span class="progress__label">Уровень</span>
          <span class="progress__value">{{ appStore.user?.level || 1 }}</span>
        </div>
        <div>
          <span class="progress__label">Очки</span>
          <span class="progress__value">{{ appStore.user?.points || 0 }}</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__inner" :style="progressStyle" />
      </div>
      <p class="hint">До следующего уровня: {{ nextLevelHint }}</p>
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

const appStore = useAppStore();
const { user } = storeToRefs(appStore);

const userName = computed(() => {
  if (!user.value) {
    return 'Пройдите регистрацию';
  }
  return `${user.value.firstName} ${user.value.lastName}`;
});

const progressStyle = computed(() => {
  const points = user.value?.points || 0;
  const remainder = points % 100;
  return { width: `${Math.min(remainder, 100)}%` };
});

const nextLevelHint = computed(() => {
  const points = user.value?.points || 0;
  const remainder = points % 100;
  return `${100 - remainder} очков`;
});

onMounted(() => {
  if (appStore.isAuthenticated) {
    appStore.refreshProfile();
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
