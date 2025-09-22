<template>
  <PageContainer title="Детали аттестации" :subtitle="assessment?.title || '—'">
    <LoadingState v-if="assessmentsStore.isLoading" />
    <template v-else>
      <InfoCard v-if="assessment" title="Информация">
        <p class="description">{{ assessment.description || 'Описание не указано' }}</p>
        <div class="meta">
          <span>Открытие: {{ formatDate(assessment.openAt) }}</span>
          <span>Закрытие: {{ formatDate(assessment.closeAt) }}</span>
          <span>Таймер: {{ assessment.timeLimitMinutes }} мин</span>
          <span>Порог: {{ assessment.passScorePercent }}%</span>
          <span>Попыток: {{ assessment.maxAttempts }}</span>
          <span>Филиалы: {{ branchLabels }}</span>
        </div>
      </InfoCard>

      <InfoCard v-if="assessment" title="Вопросы">
        <ol class="questions">
          <li v-for="question in assessment.questions" :key="question.id" class="question">
            <div class="question__text">{{ question.text }}</div>
            <ul class="question__options">
              <li
                v-for="option in question.options"
                :key="option.id"
                :class="{ 'question__option--correct': option.isCorrect }"
              >
                {{ option.text }}
              </li>
            </ul>
          </li>
        </ol>
      </InfoCard>

      <InfoCard v-if="participants.length" title="Участники">
        <div class="participants__actions">
          <button class="secondary-button" type="button" @click="exportReport('excel')">Экспорт в Excel</button>
          <button class="secondary-button" type="button" @click="exportReport('pdf')">Экспорт в PDF</button>
        </div>
        <div class="participants-wrapper">
          <table class="participants">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Филиал</th>
              <th>Должность</th>
              <th>Статус</th>
              <th>Результат</th>
              <th>Время</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in participants" :key="row.id">
              <td>{{ row.lastName }} {{ row.firstName }}</td>
              <td>{{ row.branchName || '—' }}</td>
              <td>{{ row.positionName || '—' }}</td>
              <td>{{ participantStatusLabel(row.status) }}</td>
              <td>{{ formatScore(row.scorePercent) }}</td>
              <td>{{ row.timeSpentSeconds != null ? formatDuration(row.timeSpentSeconds) : '—' }}</td>
              <td>{{ formatDate(row.completedAt) }}</td>
            </tr>
          </tbody>
          </table>
        </div>
      </InfoCard>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import LoadingState from '../components/LoadingState.vue';
import { useAssessmentsStore } from '../store/assessmentsStore';
import { showAlert, showBackButton, hideBackButton } from '../services/telegram';

const route = useRoute();
const router = useRouter();
const assessmentsStore = useAssessmentsStore();

const assessmentId = computed(() => Number(route.params.id));
const assessment = computed(() => assessmentsStore.currentAssessment);
const branchLabels = computed(() => {
  const list = assessment.value?.branches || [];
  if (!list.length) {
    return '—';
  }
  return list.map((branch) => branch.name).join(', ');
});
const participants = computed(() => assessment.value?.participants || []);
let cleanupBack = () => {};

function formatDate(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('ru-RU');
}

function participantStatusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'Завершил';
    case 'in_progress':
      return 'В процессе';
    case 'not_started':
      return 'Не начинал';
    case 'cancelled':
      return 'Отменено';
    default:
      return status || '—';
  }
}

function formatScore(value) {
  if (value == null) {
    return '—';
  }
  return `${Number(value).toFixed(2)}%`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function exportReport(format) {
  showAlert(`Функция экспорта (${format.toUpperCase()}) появится позже.`);
}

function goBack() {
  const fallback = { name: 'settings', query: { tab: 'assessments' } };
  if (window.history.length > 1) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

onMounted(async () => {
  cleanupBack = showBackButton(goBack);
  try {
    if (!assessmentId.value) {
      router.replace({ name: 'settings', query: { tab: 'assessments' } });
      return;
    }
    await assessmentsStore.fetchAssessment(assessmentId.value);
  } catch (error) {
    showAlert(error.message || 'Не удалось загрузить аттестацию');
    router.replace({ name: 'settings', query: { tab: 'assessments' } });
  }
});

onBeforeUnmount(() => {
  assessmentsStore.currentAssessment = null;
  cleanupBack();
  hideBackButton();
});
</script>

<style scoped>
.description {
  margin: 0 0 12px;
  font-size: 14px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.questions {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.question__text {
  font-weight: 600;
  margin-bottom: 6px;
}

.question__options {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.question__option--correct {
  color: #0a84ff;
  font-weight: 600;
}

.participants__actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.participants-wrapper {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.participants-wrapper::-webkit-scrollbar {
  display: none;
}

.participants {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.participants th,
.participants td {
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 8px;
  text-align: left;
}

.secondary-button {
  border-radius: 12px;
  border: none;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: var(--tg-theme-secondary-bg-color, #f5f7fb);
  color: var(--tg-theme-text-color, #0a0a0a);
}
</style>
