<template>
  <div class="panel">
    <InfoCard title="Аттестации">
      <div class="header">
        <button class="primary-button" type="button" @click="goToCreate">Создать аттестацию</button>
        <button class="secondary-button" type="button" :disabled="assessmentsStore.isLoading" @click="refresh">Обновить</button>
      </div>
      <LoadingState v-if="assessmentsStore.isLoading" />
      <template v-else>
        <p v-if="!assessments.length" class="hint">Аттестации не найдены.</p>
        <ul v-else class="assessment-list">
          <li v-for="item in assessments" :key="item.id" class="assessment-item">
            <div class="assessment-item__info" @click="viewDetail(item.id)">
              <div class="assessment-item__title">{{ item.title }}</div>
              <div class="assessment-item__meta">
                <span>Открытие: {{ formatDate(item.openAt) }}</span>
                <span>Закрытие: {{ formatDate(item.closeAt) }}</span>
                <span>Статус: {{ statusLabel(item.status) }}</span>
              </div>
            </div>
            <div class="assessment-item__stats">
              <span>Назначено: {{ item.assignedCount ?? "—" }}</span>
              <span>Завершили: {{ item.completedCount ?? "—" }}</span>
            </div>
            <div class="assessment-item__actions">
              <button class="secondary-button" type="button" :disabled="!canModify(item)" @click="editAssessment(item.id)">Редактировать</button>
              <button class="danger-button" type="button" :disabled="!canModify(item) || isDeleting(item.id)" @click="deleteAssessment(item.id)">
                <span v-if="isDeleting(item.id)" class="button-loader" />
                {{ isDeleting(item.id) ? "Удаляем…" : "Удалить" }}
              </button>
            </div>
          </li>
        </ul>
      </template>
    </InfoCard>

  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import InfoCard from "../InfoCard.vue";
import LoadingState from "../LoadingState.vue";
import { useAssessmentsStore } from "../../store/assessmentsStore";
import { showAlert, showConfirm, hapticImpact } from "../../services/telegram";

const assessmentsStore = useAssessmentsStore();
const router = useRouter();

const assessments = computed(() => assessmentsStore.assessments || []);

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU");
}

function statusLabel(status) {
  switch (status) {
    case "pending":
      return "Ожидает запуска";
    case "active":
      return "Открыта";
    case "closed":
      return "Закрыта";
    default:
      return status;
  }
}

function canModify(item) {
  return item.status === "pending";
}

function isDeleting(id) {
  return assessmentsStore.pendingAction === "delete" && assessmentsStore.pendingId === id && assessmentsStore.isSubmitting;
}

async function refresh() {
  try {
    await assessmentsStore.fetchAssessments();
  } catch (error) {
    showAlert(error.message || "Не удалось загрузить аттестации");
  }
}

function goToCreate() {
  router.push({ name: "assessment-create" });
}

function editAssessment(id) {
  router.push({ name: "assessment-edit", params: { id } });
}

async function deleteAssessment(id) {
  const confirmed = await showConfirm("Удалить аттестацию? Действие необратимо.");
  if (!confirmed) {
    return;
  }
  try {
    await assessmentsStore.deleteAssessment(id);
    hapticImpact("medium");
  } catch (error) {
    showAlert(error.message || "Не удалось удалить аттестацию");
  }
}

function viewDetail(id) {
  router.push({ name: "assessment-detail", params: { id } });
}

onMounted(async () => {
  try {
    await assessmentsStore.fetchAssessments();
  } catch (error) {
    showAlert(error.message || "Не удалось загрузить аттестации");
  }
});
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.assessment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assessment-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  padding: 14px;
  background: var(--tg-theme-bg-color, #ffffff);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: left;
}

.assessment-item__info {
  cursor: pointer;
}

.assessment-item__title {
  font-weight: 600;
  font-size: 16px;
}

.assessment-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.assessment-item__stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.assessment-item__actions {
  display: flex;
  gap: 8px;
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

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
