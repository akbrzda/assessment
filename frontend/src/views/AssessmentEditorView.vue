<template>
  <PageContainer :title="pageTitle" :subtitle="pageSubtitle">
    <LoadingState v-if="isInitialLoading" />
    <template v-else>
      <form class="form" @submit.prevent="handleSubmit">
      <InfoCard title="Основная информация">
        <div class="form-grid">
          <label class="form__field">
            <span>Название</span>
            <BaseInput v-model="form.title" placeholder="Например, Проверка знаний меню" />
          </label>
          <label class="form__field">
            <span>Дата открытия</span>
            <BaseInput v-model="form.openAt" type="datetime-local" />
          </label>
          <label class="form__field">
            <span>Дата закрытия</span>
            <BaseInput v-model="form.closeAt" type="datetime-local" />
          </label>
        </div>
        <label class="form__field">
          <span>Описание</span>
          <BaseTextarea v-model="form.description" placeholder="Краткое описание" rows="4" />
        </label>
        <div class="form-grid">
          <label class="form__field">
            <span>Таймер (мин)</span>
            <BaseInput v-model.number="form.timeLimitMinutes" type="number" min="1" max="240" />
          </label>
          <label class="form__field">
            <span>Порог (%)</span>
            <BaseInput v-model.number="form.passScorePercent" type="number" min="0" max="100" />
          </label>
          <label class="form__field">
            <span>Попыток</span>
            <BaseInput v-model.number="form.maxAttempts" type="number" min="1" max="3" />
          </label>
        </div>
      </InfoCard>

      <InfoCard title="Назначение">
        <p class="hint">Выберите филиалы, сотрудников и/или должности для назначения аттестации.</p>
        <div class="targets">
          <div class="targets__column">
            <h4>Филиалы</h4>
            <template v-if="isSuperAdmin">
              <div class="list" v-if="targets.branches?.length">
                <label v-for="branch in targets.branches" :key="branch.id" class="list__item">
                  <input type="checkbox" :value="branch.id" v-model="form.branchIds" />
                  <span>{{ branch.name }}</span>
                </label>
              </div>
              <p v-else class="hint">Справочник филиалов не загружен.</p>
            </template>
            <template v-else>
              <p class="hint">Аттестация доступна в филиале: {{ managerBranchName || '—' }}</p>
            </template>
          </div>
          <div class="targets__column">
            <h4>Сотрудники</h4>
            <div class="list" v-if="targets.users.length">
              <label v-for="user in targets.users" :key="user.id" class="list__item">
                <input type="checkbox" :value="user.id" v-model="form.userIds" />
                <span>{{ user.lastName }} {{ user.firstName }} • {{ user.positionName }}</span>
              </label>
            </div>
            <p v-else class="hint">Нет доступных сотрудников.</p>
          </div>
          <div class="targets__column">
            <h4>Должности</h4>
            <div class="list" v-if="targets.positions.length">
              <label v-for="position in targets.positions" :key="position.id" class="list__item">
                <input type="checkbox" :value="position.id" v-model="form.positionIds" />
                <span>{{ position.name }}</span>
              </label>
            </div>
            <p v-else class="hint">Справочник должностей не загружен.</p>
          </div>
        </div>
      </InfoCard>

      <InfoCard title="Вопросы">
        <div class="questions__header">
          <h3>Список вопросов</h3>
          <button class="secondary-button" type="button" @click="addQuestion">Добавить вопрос</button>
        </div>
        <p v-if="!form.questions.length" class="hint">Добавьте хотя бы один вопрос.</p>
        <div v-for="(question, qIndex) in form.questions" :key="question.uid" class="question-card">
          <div class="question-card__header">
            <h4>Вопрос {{ qIndex + 1 }}</h4>
            <button class="danger-link" type="button" @click="removeQuestion(qIndex)">Удалить</button>
          </div>
          <BaseTextarea v-model="question.text" placeholder="Текст вопроса" rows="3" />
          <div class="options">
            <div
              v-for="(option, oIndex) in question.options"
              :key="option.uid"
              class="option-item"
            >
              <label class="option-item__radio">
                <input
                  type="radio"
                  :name="`question-${question.uid}-answer`"
                  :checked="option.isCorrect"
                  @change="markCorrect(qIndex, oIndex)"
                />
                <span>Правильный ответ</span>
              </label>
              <BaseInput v-model="option.text" placeholder="Вариант ответа" />
              <button
                class="danger-link"
                type="button"
                :disabled="question.options.length <= 2"
                @click="removeOption(qIndex, oIndex)"
              >
                Удалить
              </button>
            </div>
            <button class="secondary-button" type="button" @click="addOption(qIndex)">Добавить вариант</button>
          </div>
        </div>
      </InfoCard>
    </form>

    <div class="actions">
      <button class="secondary-button" type="button" @click="cancelEditing">Отмена</button>
      <button class="primary-button" type="button" :disabled="submitDisabled" @click="handleSubmit">
        <span v-if="assessmentsStore.isSubmitting" class="button-loader" />
        {{ isEditMode ? 'Сохранить' : 'Создать' }}
      </button>
    </div>
    <p v-if="draftSavedAt && !isEditMode" class="draft-hint">Черновик сохранён {{ draftSavedAt }}</p>
    </template>
  </PageContainer>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import LoadingState from '../components/LoadingState.vue';
import BaseInput from '../components/common/BaseInput.vue';
import BaseTextarea from '../components/common/BaseTextarea.vue';
import { useAssessmentsStore } from '../store/assessmentsStore';
import { useAppStore } from '../store/appStore';
import { showAlert, hapticImpact, showBackButton, hideBackButton } from '../services/telegram';
import { getItem, setItem, removeItem } from '../services/storage';

const DRAFT_STORAGE_KEY = 'assessment_draft';

const assessmentsStore = useAssessmentsStore();
const appStore = useAppStore();
const route = useRoute();
const router = useRouter();

const assessmentId = computed(() => (route.params.id ? Number(route.params.id) : null));
const isEditMode = computed(() => Boolean(assessmentId.value));

const form = reactive(createEmptyForm());
const targets = computed(() => assessmentsStore.targets || { users: [], positions: [], branches: [] });
const draftSavedAt = ref(null);
let draftTimer = null;
let suppressAutosave = false;
let cleanupBack = () => {};

const pageTitle = computed(() => (isEditMode.value ? 'Редактирование аттестации' : 'Новая аттестация'));
const pageSubtitle = computed(() => (isEditMode.value ? 'Измените данные аттестации' : 'Заполните информацию об аттестации'));
const isInitialLoading = computed(() => assessmentsStore.targetsLoading || (isEditMode.value && assessmentsStore.isLoading));
const isSuperAdmin = computed(() => appStore.isSuperAdmin);
const isManager = computed(() => appStore.isManager);
const managerBranchName = computed(() => targets.value.branches?.[0]?.name || appStore.user?.branchName || '');

function createUid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyForm() {
  return {
    title: '',
    description: '',
    openAt: '',
    closeAt: '',
    timeLimitMinutes: 30,
    passScorePercent: 80,
    maxAttempts: 1,
    branchIds: [],
    userIds: [],
    positionIds: [],
    questions: []
  };
}

function resetForm() {
  Object.assign(form, createEmptyForm());
}

function toDateTimeLocal(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return date.toISOString();
}

function addQuestion(prefill) {
  form.questions.push({
    uid: createUid(),
    text: prefill?.text || '',
    options: (prefill?.options || [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false }
    ]).map((option, index) => ({
      uid: createUid(),
      text: option.text || '',
      isCorrect: index === 0 ? true : Boolean(option.isCorrect)
    }))
  });
}

function removeQuestion(index) {
  form.questions.splice(index, 1);
}

function addOption(questionIndex) {
  const question = form.questions[questionIndex];
  question.options.push({ uid: createUid(), text: '', isCorrect: false });
}

function removeOption(questionIndex, optionIndex) {
  const question = form.questions[questionIndex];
  if (question.options.length <= 2) {
    return;
  }
  const removed = question.options.splice(optionIndex, 1);
  if (removed[0]?.isCorrect && question.options.length) {
    question.options[0].isCorrect = true;
  }
}

function markCorrect(questionIndex, optionIndex) {
  const question = form.questions[questionIndex];
  question.options.forEach((option, index) => {
    option.isCorrect = index === optionIndex;
  });
}

function validateForm() {
  if (!form.title.trim()) {
    return 'Введите название аттестации';
  }
  if (!form.openAt || !form.closeAt) {
    return 'Укажите даты открытия и закрытия';
  }
  const openDate = new Date(form.openAt);
  const closeDate = new Date(form.closeAt);
  if (closeDate <= openDate) {
    return 'Дата закрытия должна быть позже даты открытия';
  }
  if (!form.userIds.length && !form.positionIds.length && !form.branchIds.length) {
    return 'Выберите хотя бы одного сотрудника, должность или филиал';
  }
  if (!form.questions.length) {
    return 'Добавьте хотя бы один вопрос';
  }
  for (const [index, question] of form.questions.entries()) {
    if (!question.text.trim()) {
      return `Заполните текст вопроса №${index + 1}`;
    }
    if (question.options.length < 2) {
      return `Добавьте минимум два варианта в вопросе №${index + 1}`;
    }
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      return `Выберите ровно один правильный ответ в вопросе №${index + 1}`;
    }
    if (question.options.some((option) => !option.text.trim())) {
      return `Заполните текст всех вариантов в вопросе №${index + 1}`;
    }
  }
  return null;
}

const submitDisabled = computed(() => assessmentsStore.isSubmitting || Boolean(validateForm()));

function normalizeQuestions() {
  return form.questions.map((question) => ({
    text: question.text.trim(),
    options: question.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: Boolean(option.isCorrect)
    }))
  }));
}

function buildPayload() {
  return {
    title: form.title.trim(),
    description: form.description || '',
    openAt: fromDateTimeLocal(form.openAt),
    closeAt: fromDateTimeLocal(form.closeAt),
    timeLimitMinutes: Number(form.timeLimitMinutes),
    passScorePercent: Number(form.passScorePercent),
    maxAttempts: Number(form.maxAttempts),
    branchIds: form.branchIds.map((value) => Number(value)),
    userIds: form.userIds.map((value) => Number(value)),
    positionIds: form.positionIds.map((value) => Number(value)),
    questions: normalizeQuestions()
  };
}

function serializeForm() {
  return JSON.parse(JSON.stringify({
    ...form,
    branchIds: [...form.branchIds],
    questions: form.questions.map((question) => ({
      text: question.text,
      options: question.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect
      }))
    }))
  }));
}

async function saveDraft() {
  if (isEditMode.value) {
    return;
  }
  try {
    const snapshot = serializeForm();
    await setItem(DRAFT_STORAGE_KEY, snapshot);
    draftSavedAt.value = new Date().toLocaleString('ru-RU');
  } catch (error) {
    // silent
  }
}

function scheduleDraftSave() {
  if (isEditMode.value || suppressAutosave) {
    return;
  }
  if (draftTimer) {
    clearTimeout(draftTimer);
  }
  draftTimer = setTimeout(saveDraft, 600);
}

async function loadDraft() {
  if (isEditMode.value) {
    return;
  }
  try {
    const draft = await getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      suppressAutosave = true;
      Object.assign(form, createEmptyForm());
      form.title = draft.title || '';
      form.description = draft.description || '';
      form.openAt = draft.openAt || '';
      form.closeAt = draft.closeAt || '';
      form.timeLimitMinutes = draft.timeLimitMinutes || 30;
      form.passScorePercent = draft.passScorePercent || 80;
      form.maxAttempts = draft.maxAttempts || 1;
      form.branchIds = (draft.branchIds || []).map((id) => Number(id));
      form.userIds = draft.userIds || [];
      form.positionIds = draft.positionIds || [];
      form.questions = [];
      (draft.questions || []).forEach((question) => {
        addQuestion({
          text: question.text,
          options: question.options
        });
      });
      suppressAutosave = false;
      draftSavedAt.value = new Date().toLocaleString('ru-RU');
    } else {
      populateDefaultDates();
    }
  } catch (error) {
    populateDefaultDates();
  }
}

function populateDefaultDates() {
  if (form.openAt && form.closeAt) {
    return;
  }
  suppressAutosave = true;
  const now = new Date();
  const openAt = new Date(now.getTime() + 15 * 60 * 1000);
  const closeAt = new Date(openAt.getTime() + 24 * 60 * 60 * 1000);
  form.openAt = toDateTimeLocal(openAt);
  form.closeAt = toDateTimeLocal(closeAt);
  suppressAutosave = false;
}

async function clearDraft() {
  if (isEditMode.value) {
    return;
  }
  try {
    await removeItem(DRAFT_STORAGE_KEY);
    draftSavedAt.value = null;
  } catch (error) {
    // silent
  }
}

async function loadAssessment(id) {
  const assessment = await assessmentsStore.fetchAssessment(id);
  suppressAutosave = true;
  Object.assign(form, createEmptyForm());
  form.title = assessment.title;
  form.description = assessment.description || '';
  form.openAt = toDateTimeLocal(assessment.openAt);
  form.closeAt = toDateTimeLocal(assessment.closeAt);
  form.timeLimitMinutes = assessment.timeLimitMinutes;
  form.passScorePercent = assessment.passScorePercent;
  form.maxAttempts = assessment.maxAttempts;
  form.branchIds = (assessment.branches || []).map((branch) => Number(branch.id));
  form.userIds = (assessment.users || []).map((user) => user.id);
  form.positionIds = (assessment.positions || []).map((position) => position.id);
  form.questions = [];
  (assessment.questions || []).forEach((question) => {
    addQuestion({
      text: question.text,
      options: question.options
    });
  });
  suppressAutosave = false;
}

async function handleSubmit() {
  const validationError = validateForm();
  if (validationError) {
    showAlert(validationError);
    return;
  }

  const payload = buildPayload();
  try {
    if (isEditMode.value && assessmentId.value) {
      await assessmentsStore.updateAssessment(assessmentId.value, payload);
    } else {
      await assessmentsStore.createAssessment(payload);
      await clearDraft();
    }
    hapticImpact('medium');
    redirectToSettings();
  } catch (error) {
    showAlert(error.message || 'Не удалось сохранить аттестацию');
  }
}

function redirectToSettings() {
  router.replace({ name: 'settings', query: { tab: 'assessments' } });
}

function cancelEditing() {
  redirectToSettings();
}

function goBack() {
  const fallback = { name: 'settings', query: { tab: 'assessments' } };
  if (window.history.length > 1) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

watch(form, () => {
  if (!suppressAutosave) {
    scheduleDraftSave();
  }
}, { deep: true });

watch(
  () => targets.value.branches,
  (branches) => {
    if (!isManager.value) {
      return;
    }
    const branchId = branches?.[0]?.id || appStore.user?.branchId;
    const normalized = branchId != null ? Number(branchId) : null;
    if (!normalized) {
      return;
    }
    if (form.branchIds.length === 1 && form.branchIds[0] === normalized) {
      return;
    }
    suppressAutosave = true;
    form.branchIds = [normalized];
    suppressAutosave = false;
  },
  { immediate: true }
);

watch(
  () => targets.value.branches,
  (branches) => {
    if (!isManager.value) {
      return;
    }
    const branchId = branches?.[0]?.id || appStore.user?.branchId;
    const normalized = branchId != null ? Number(branchId) : null;
    if (!normalized) {
      return;
    }
    if (form.branchIds.length === 1 && form.branchIds[0] === normalized) {
      return;
    }
    suppressAutosave = true;
    form.branchIds = [normalized];
    suppressAutosave = false;
  },
  { immediate: true }
);

onMounted(async () => {
  try {
    cleanupBack = showBackButton(goBack);
    await assessmentsStore.fetchTargets();
    if (isEditMode.value && assessmentId.value) {
      await loadAssessment(assessmentId.value);
    } else {
      await loadDraft();
    }
  } catch (error) {
    showAlert(error.message || 'Не удалось подготовить форму аттестации');
  }
});

onBeforeUnmount(() => {
  if (draftTimer) {
    clearTimeout(draftTimer);
  }
  cleanupBack();
  hideBackButton();
});
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.targets {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.targets__column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.list__item {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.questions__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.option-item__radio {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 12px;
}

.primary-button,
.secondary-button {
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

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.danger-link {
  border: none;
  background: transparent;
  color: #ef4343;
  cursor: pointer;
  font-size: 13px;
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

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.draft-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #6f7a8b);
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
const isSuperAdmin = computed(() => appStore.isSuperAdmin);
const isManager = computed(() => appStore.isManager);
const managerBranchName = computed(() => targets.value.branches?.[0]?.name || appStore.user?.branchName || '');
