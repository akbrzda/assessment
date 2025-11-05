<template>
  <div class="form-wrapper">
    <Preloader v-if="loading" />
    <form v-else @submit.prevent="handleSubmit" class="form-container">
      <!-- Основная информация -->
      <section class="form-section">
        <h3 class="section-heading">Основная информация</h3>

        <Input v-model="form.title" type="text" label="Название" required />

        <Textarea v-model="form.description" label="Описание" :rows="3" />

        <div class="form-grid-2">
          <Input
            v-model="form.openAt"
            type="date"
            label="Дата открытия"
            min="1900-01-01"
            :max="maxDate"
            required
            :error="errors.openAt"
            @blur="validateDateField('openAt')"
          />
          <Input
            v-model="form.closeAt"
            type="date"
            label="Дата закрытия"
            min="1900-01-01"
            :max="maxDate"
            required
            :error="errors.closeAt"
            @blur="validateDateField('closeAt')"
          />
        </div>

        <div class="form-grid-3">
          <Input v-model.number="form.timeLimitMinutes" type="number" label="Время на тест (мин)" min="1" required />
          <Input v-model.number="form.passScorePercent" type="number" label="Проходной балл (%)" min="0" max="100" required />
          <Input v-model.number="form.maxAttempts" type="number" label="Максимум попыток" min="1" required />
        </div>
      </section>

      <!-- Назначение -->
      <section class="form-section">
        <h3 class="section-heading">Назначить аттестацию</h3>

        <CheckboxGroup v-model="form.branchIds" label="Филиалы" :options="branchOptions" />

        <CheckboxGroup v-model="form.positionIds" label="Должности" :options="positionOptions" />
      </section>

      <!-- Вопросы -->
      <section class="form-section">
        <div class="section-header">
          <h3 class="section-heading">Вопросы <span class="required">*</span></h3>
          <button type="button" @click="addQuestion" class="btn-add-question">+ Добавить вопрос</button>
        </div>

        <div v-for="(question, qIndex) in form.questions" :key="qIndex" class="question-card">
          <div class="question-header">
            <h4 class="question-title">Вопрос {{ qIndex + 1 }}</h4>
            <button type="button" @click="removeQuestion(qIndex)" class="btn-delete-question">Удалить</button>
          </div>

          <div class="form-group">
            <label class="form-label">Текст вопроса</label>
            <input v-model="question.text" type="text" required class="form-control" />
          </div>

          <div class="form-group">
            <div class="options-header">
              <label class="form-label">Варианты ответов (2-6)</label>
              <button type="button" @click="addOption(qIndex)" :disabled="question.options.length >= 6" class="btn-add-option">+ Вариант</button>
            </div>

            <div class="options-list">
              <div v-for="(option, oIndex) in question.options" :key="oIndex" class="option-row">
                <input v-model="option.text" type="text" required placeholder="Текст варианта" class="form-control option-input" />
                <label class="option-label">
                  <input
                    type="radio"
                    :name="`correct-${qIndex}`"
                    :checked="option.isCorrect"
                    @change="setCorrectOption(qIndex, oIndex)"
                    class="form-radio"
                  />
                  <span>Правильный</span>
                </label>
                <button type="button" @click="removeOption(qIndex, oIndex)" :disabled="question.options.length <= 2" class="btn-delete-option">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <p v-if="form.questions.length === 0" class="empty-questions">Нет вопросов. Добавьте хотя бы один вопрос.</p>
      </section>

      <!-- Кнопки -->
      <div class="form-actions">
        <Button @click="$emit('cancel')" variant="secondary">Отмена</Button>
        <Button type="submit" :disabled="!isFormValid" variant="primary">
          {{ assessmentId ? "Сохранить" : "Создать" }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getAssessmentById, createAssessment, updateAssessment } from "../api/assessments";
import { getReferences } from "../api/users";
import { validateDate, validateDateRange, dateToISOWithMidnight } from "../utils/dateValidation";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Select from "./ui/Select.vue";
import Button from "./ui/Button.vue";
import Textarea from "./ui/Textarea.vue";
import CheckboxGroup from "./ui/CheckboxGroup.vue";

const props = defineProps({
  assessmentId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const loading = ref(false);
const errors = ref({});
const references = ref({ branches: [], positions: [], roles: [] });

const form = ref({
  title: "",
  description: "",
  openAt: "",
  closeAt: "",
  timeLimitMinutes: 30,
  passScorePercent: 70,
  maxAttempts: 3,
  branchIds: [],
  positionIds: [],
  userIds: [],
  questions: [],
});

const isFormValid = computed(() => {
  if (!form.value.title || !form.value.openAt || !form.value.closeAt) return false;
  if (form.value.questions.length === 0) return false;

  // Проверить, что у всех вопросов есть правильный ответ
  for (const question of form.value.questions) {
    if (!question.text) return false;
    if (question.options.length < 2) return false;
    if (!question.options.some((opt) => opt.isCorrect)) return false;
  }

  return true;
});

const branchOptions = computed(() =>
  references.value.branches.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }))
);

const positionOptions = computed(() =>
  references.value.positions.map((position) => ({
    value: position.id,
    label: position.name,
  }))
);

// Максимальная дата (текущий год + 100)
const maxDate = computed(() => {
  const currentYear = new Date().getFullYear();
  return `${currentYear + 100}-12-31`;
});

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = data;
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadAssessment = async () => {
  if (!props.assessmentId) return;

  loading.value = true;
  try {
    const data = await getAssessmentById(props.assessmentId);
    const assessment = data.assessment;

    // Преобразуем datetime в формат date (YYYY-MM-DD)
    const openAtDate = new Date(assessment.open_at).toISOString().slice(0, 10);
    const closeAtDate = new Date(assessment.close_at).toISOString().slice(0, 10);

    form.value = {
      title: assessment.title,
      description: assessment.description || "",
      openAt: openAtDate,
      closeAt: closeAtDate,
      timeLimitMinutes: assessment.time_limit_minutes,
      passScorePercent: assessment.pass_score_percent,
      maxAttempts: assessment.max_attempts,
      branchIds: [],
      positionIds: [],
      userIds: [],
      questions: assessment.questions.map((q) => ({
        text: q.question_text,
        options: q.options.map((opt) => ({
          text: opt.option_text,
          isCorrect: opt.is_correct === 1,
        })),
      })),
    };
  } catch (error) {
    console.error("Load assessment error:", error);
    alert("Ошибка загрузки аттестации");
  } finally {
    loading.value = false;
  }
};

const validateDateField = (fieldName) => {
  const value = form.value[fieldName];
  let error = null;

  // Валидация самой даты
  const validation = validateDate(value);
  if (!validation.isValid) {
    errors.value[fieldName] = validation.error;
    return;
  }

  // Валидация диапазона дат
  if (fieldName === "closeAt" && form.value.openAt) {
    const rangeValidation = validateDateRange(form.value.openAt, form.value.closeAt);
    if (!rangeValidation.isValid) {
      error = rangeValidation.error;
    }
  }

  if (error) {
    errors.value[fieldName] = error;
  } else {
    delete errors.value[fieldName];
  }
};

const addQuestion = () => {
  form.value.questions.push({
    text: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  });
};

const removeQuestion = (qIndex) => {
  form.value.questions.splice(qIndex, 1);
};

const addOption = (qIndex) => {
  if (form.value.questions[qIndex].options.length < 6) {
    form.value.questions[qIndex].options.push({
      text: "",
      isCorrect: false,
    });
  }
};

const removeOption = (qIndex, oIndex) => {
  const question = form.value.questions[qIndex];
  if (question.options.length > 2) {
    question.options.splice(oIndex, 1);
  }
};

const setCorrectOption = (qIndex, oIndex) => {
  const question = form.value.questions[qIndex];
  question.options.forEach((opt, idx) => {
    opt.isCorrect = idx === oIndex;
  });
};

const handleSubmit = async () => {
  // Валидация дат перед отправкой
  validateDateField("openAt");
  validateDateField("closeAt");

  if (Object.keys(errors.value).length > 0) {
    alert("Пожалуйста, исправьте ошибки в форме");
    return;
  }

  if (!isFormValid.value) {
    alert("Пожалуйста, заполните все обязательные поля и добавьте хотя бы один вопрос");
    return;
  }

  loading.value = true;
  try {
    // Преобразуем даты в формат с временем 00:00
    const assessmentData = {
      ...form.value,
      openAt: dateToISOWithMidnight(form.value.openAt),
      closeAt: dateToISOWithMidnight(form.value.closeAt),
    };

    if (props.assessmentId) {
      await updateAssessment(props.assessmentId, assessmentData);
      alert("Аттестация обновлена");
    } else {
      await createAssessment(assessmentData);
      alert("Аттестация создана");
    }
    emit("submit");
  } catch (error) {
    console.error("Save assessment error:", error);
    alert("Ошибка сохранения аттестации");
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadReferences();
  if (props.assessmentId) {
    await loadAssessment();
  }
});
</script>

<style scoped>
.form-wrapper {
  width: 100%;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.required {
  color: #d4183d;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--accent-blue);
  background-color: var(--surface-card);
}

.form-select {
  background-color: var(--input-bg);
}

.form-help-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  margin-top: 4px;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.btn-add-question {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  background-color: var(--accent-green);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-add-question:hover {
  opacity: 0.9;
}

.question-card {
  padding: 16px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background-color: var(--surface-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.question-title {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.btn-delete-question {
  padding: 4px 12px;
  font-size: 14px;
  color: #d4183d;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-delete-question:hover {
  opacity: 0.8;
}

.options-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-add-option {
  padding: 5.6px 12px;
  font-size: 12px;
  font-weight: 600;
  background-color: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-add-option:hover:not(:disabled) {
  background-color: var(--accent-blue-hover);
}

.btn-add-option:disabled {
  opacity: 0.5;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-input {
  flex: 1;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}

.form-radio {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent-green);
}

.btn-delete-option {
  padding: 4px 8px;
  color: #d4183d;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-delete-option:hover:not(:disabled) {
  opacity: 0.8;
}

.btn-delete-option:disabled {
  opacity: 0.3;
}

.empty-questions {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: var(--accent-blue);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--accent-blue-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}

.btn-secondary:hover {
  background-color: var(--divider);
}

@media (max-width: 1024px) {
  .form-grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }

  .option-row {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .form-container {
    gap: 24px;
  }

  .form-grid-2,
  .form-grid-3 {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .btn-add-question {
    width: 100%;
  }
}
</style>
