<template>
  <div class="assessment-wizard">
    <!-- Progress Steps -->
    <div class="wizard-steps">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="wizard-step"
        :class="{ active: currentStep === index + 1, completed: currentStep > index + 1 }"
      >
        <div class="step-number">{{ index + 1 }}</div>
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="wizard-content">
      <Preloader v-if="loading" />

      <!-- Шаг 1: Основная информация -->
      <div v-else-if="currentStep === 1" class="step-content">
        <h3 class="step-title">Основная информация</h3>

        <Input v-model="formData.title" type="text" label="Название" placeholder="Например: Аттестация Q4 2025" required />

        <Textarea v-model="formData.description" label="Описание" :rows="3" placeholder="Краткое описание аттестации" />
      </div>

      <!-- Шаг 2: Вопросы -->
      <div v-else-if="currentStep === 2" class="step-content">
        <h3 class="step-title">Вопросы аттестации</h3>

        <div class="questions-mode-tabs">
          <button :class="{ active: questionsMode === 'bank' }" @click="questionsMode = 'bank'" class="mode-tab">Из банка вопросов</button>
          <button :class="{ active: questionsMode === 'custom' }" @click="questionsMode = 'custom'" class="mode-tab">Создать свои</button>
        </div>

        <!-- Выбор из банка -->
        <div v-if="questionsMode === 'bank'" class="bank-questions-section">
          <div class="bank-header">
            <Input v-model="questionSearch" placeholder="Поиск по вопросам..." @input="searchBankQuestions" />
            <Select v-model="selectedCategory" :options="categoryOptions" placeholder="Выберите категорию" @change="searchBankQuestions" />
          </div>

          <div class="selected-count">
            Выбрано вопросов: <strong>{{ selectedBankQuestions.length }}</strong>
          </div>
          <div v-if="loadingBankQuestions" class="loading-state">Загрузка вопросов...</div>

          <div v-else-if="bankQuestions.length === 0" class="empty-state">
            <p>Вопросы не найдены. Создайте вопросы в банке вопросов или добавьте свои.</p>
          </div>

          <div v-else class="bank-questions-list">
            <div
              v-for="question in bankQuestions"
              :key="question.id"
              class="bank-question-item"
              :class="{ selected: isQuestionSelected(question.id) }"
              @click="toggleBankQuestion(question)"
            >
              <div class="question-checkbox">
                <input type="checkbox" :checked="isQuestionSelected(question.id)" @change="() => toggleBankQuestion(question)" />
              </div>
              <div class="question-content">
                <div class="question-text">{{ question.question_text }}</div>
                <div class="question-meta">
                  <span class="question-category">{{ question.category_name }}</span>
                  <span class="question-options">{{ question.options?.length || 0 }} вариантов</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedBankQuestions.length > 0" class="selected-summary">
            <strong>Выбрано вопросов: {{ selectedBankQuestions.length }}</strong>
          </div>
        </div>

        <!-- Создание своих вопросов -->
        <div v-else class="custom-questions-section">
          <div class="questions-header">
            <p class="hint">Добавьте вопросы для аттестации (минимум 1)</p>
            <Button icon="plus" size="sm" @click="addQuestion">Добавить вопрос</Button>
          </div>

          <div v-if="formData.questions.length === 0" class="empty-state">
            <p>Нет вопросов. Добавьте хотя бы один вопрос.</p>
          </div>

          <div v-else class="questions-list">
            <div v-for="(question, qIndex) in formData.questions" :key="qIndex" class="question-card">
              <div class="question-header">
                <h4>Вопрос {{ qIndex + 1 }}</h4>
                <Button size="sm" variant="danger" @click="removeQuestion(qIndex)" icon="trash"></Button>
              </div>

              <Input v-model="question.text" type="text" label="Текст вопроса" placeholder="Введите текст вопроса" />

              <div class="form-group">
                <label>Варианты ответов (минимум 2)</label>
                <div class="options-list">
                  <div v-for="(option, oIndex) in question.options" :key="oIndex" class="option-row">
                    <Input v-model="option.text" type="text" placeholder="Текст варианта" />
                    <label class="correct-option-label">
                      <input type="radio" :name="`question-${qIndex}`" :checked="option.isCorrect" @change="() => setCorrectOption(qIndex, oIndex)" />
                      <span>Правильный</span>
                    </label>
                    <Button @click="removeOption(qIndex, oIndex)" :disabled="question.options.length <= 2" variant="danger" size="sm" icon="trash" />
                  </div>
                </div>
                <Button @click="addOption(qIndex)" :disabled="question.options.length >= 6" variant="secondary">+ Добавить вариант</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Шаг 3: Участники -->
      <div v-else-if="currentStep === 3" class="step-content">
        <h3 class="step-title">Назначение участников</h3>

        <p class="hint">Выберите один или несколько способов назначения</p>
        <div class="assignment-tabs">
          <button :class="{ active: assignmentMode === 'branches' }" @click="assignmentMode = 'branches'" class="tab-button">По филиалам</button>
          <button :class="{ active: assignmentMode === 'positions' }" @click="assignmentMode = 'positions'" class="tab-button">По должностям</button>
          <button :class="{ active: assignmentMode === 'users' }" @click="assignmentMode = 'users'" class="tab-button">Выбрать сотрудников</button>
        </div>

        <!-- По филиалам -->
        <!-- По филиалам -->
        <div v-if="assignmentMode === 'branches'" class="assignment-content">
          <div class="checkbox-group">
            <label class="group-label">Выберите филиалы</label>
            <div class="checkbox-list">
              <label v-for="branch in references.branches" :key="branch.id" class="checkbox-label">
                <input type="checkbox" :value="branch.id" v-model="formData.branchIds" />
                <span>{{ branch.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- По должностям -->
        <div v-if="assignmentMode === 'positions'" class="assignment-content">
          <div class="checkbox-group">
            <label class="group-label">Выберите должности</label>
            <div class="checkbox-list">
              <label v-for="position in references.positions" :key="position.id" class="checkbox-label">
                <input type="checkbox" :value="position.id" v-model="formData.positionIds" />
                <span>{{ position.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- По сотрудникам -->
        <div v-if="assignmentMode === 'users'" class="assignment-content">
          <Input v-model="userSearchQuery" type="text" label="Поиск сотрудников" placeholder="Поиск по имени..." @input="searchUsers" />

          <div v-if="filteredUsers.length > 0" class="checkbox-group">
            <label class="group-label">Выберите сотрудников</label>
            <div class="checkbox-list">
              <label v-for="user in filteredUsers" :key="user.id" class="checkbox-label">
                <input type="checkbox" :value="user.id" v-model="formData.userIds" />
                <span>{{ user.full_name || user.first_name }} {{ user.last_name }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="selected-summary">
          <strong>Выбрано:</strong>
          Филиалов: {{ formData.branchIds.length }}, Должностей: {{ formData.positionIds.length }}, Сотрудников: {{ formData.userIds.length }}
        </div>
      </div>

      <!-- Шаг 4: Параметры и даты -->
      <div v-else-if="currentStep === 4" class="step-content">
        <h3 class="step-title">Параметры и сроки</h3>

        <div class="form-row">
          <Input
            v-model="formData.openAt"
            type="date"
            label="Дата открытия"
            min="1900-01-01"
            :max="maxDate"
            required
            :error="errors.openAt"
            @blur="validateDateField('openAt')"
          />
          <Input
            v-model="formData.closeAt"
            type="date"
            label="Дата закрытия"
            min="1900-01-01"
            :max="maxDate"
            required
            :error="errors.closeAt"
            @blur="validateDateField('closeAt')"
          />
        </div>

        <div class="form-row">
          <Input
            v-model.number="formData.timeLimitMinutes"
            type="number"
            label="Время на тест (минут)"
            min="1"
            required
            :error="errors.timeLimitMinutes"
            @blur="validateNumberField('timeLimitMinutes', 1, null)"
          />
          <Input
            v-model.number="formData.passScorePercent"
            type="number"
            label="Проходной балл (%)"
            min="0"
            max="100"
            required
            :error="errors.passScorePercent"
            @blur="validateNumberField('passScorePercent', 0, 100)"
          />
          <Input
            v-model.number="formData.maxAttempts"
            type="number"
            label="Максимум попыток"
            min="1"
            required
            :error="errors.maxAttempts"
            @blur="validateNumberField('maxAttempts', 1, null)"
          />
        </div>

        <!-- Предпросмотр -->
        <div class="preview-section">
          <h4>Предпросмотр</h4>
          <div class="preview-card">
            <div class="preview-row">
              <span class="preview-label">Название:</span>
              <span class="preview-value">{{ formData.title || "—" }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Вопросов:</span>
              <span class="preview-value">{{ formData.questions.length }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Сроки:</span>
              <span class="preview-value"> {{ formatDateTime(formData.openAt) }} — {{ formatDateTime(formData.closeAt) }} </span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Назначено:</span>
              <span class="preview-value">
                Филиалов: {{ formData.branchIds.length }}, Должностей: {{ formData.positionIds.length }}, Сотрудников: {{ formData.userIds.length }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="wizard-navigation">
      <Button v-if="currentStep > 1" variant="secondary" @click="prevStep">Назад</Button>

      <div class="spacer"></div>

      <Button v-if="currentStep < 4" @click="nextStep" :disabled="!canProceed">Далее</Button>

      <Button v-else @click="submitAssessment" :loading="submitting" :disabled="!isFormValid" icon="check">Создать аттестацию </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import { createAssessment } from "../api/assessments";
import { getReferences, getUsers } from "../api/users";
import { getQuestions, getCategories } from "../api/questionBank";
import { validateDate, validateDateRange, dateToISOWithMidnight } from "../utils/dateValidation";
import Button from "./ui/Button.vue";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Select from "./ui/Select.vue";
import Textarea from "./ui/Textarea.vue";

const emit = defineEmits(["submit", "cancel"]);
const authStore = useAuthStore();

const loading = ref(false);
const submitting = ref(false);
const currentStep = ref(1);
const assignmentMode = ref("branches");
const questionsMode = ref("bank");
const errors = ref({});

const steps = [{ label: "Основная информация" }, { label: "Вопросы" }, { label: "Участники" }, { label: "Параметры" }];

// Банк вопросов
const loadingBankQuestions = ref(false);
const bankQuestions = ref([]);
const selectedBankQuestions = ref([]);
const questionSearch = ref("");
const selectedCategory = ref("");
const categories = ref([]);

const formData = ref({
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

const references = ref({
  branches: [],
  positions: [],
  roles: [],
});

const allUsers = ref([]);
const userSearchQuery = ref("");
const filteredUsers = computed(() => {
  if (!userSearchQuery.value) return allUsers.value;
  const query = userSearchQuery.value.toLowerCase();
  return allUsers.value.filter((user) => user.first_name.toLowerCase().includes(query) || user.last_name.toLowerCase().includes(query));
});

const categoryOptions = computed(() => [
  { value: "", label: "Все категории" },
  ...categories.value.map((cat) => ({
    value: String(cat.id),
    label: cat.name,
  })),
]);

const MAX_YEAR_OFFSET = 100;
// Максимальная дата (текущий год + 100)
const maxDate = ref(calculateMaxDate());

function calculateMaxDate() {
  const currentYear = new Date().getFullYear();
  return `${currentYear + MAX_YEAR_OFFSET}-12-31`;
}

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return formData.value.title.trim() !== "";
  }
  if (currentStep.value === 2) {
    if (questionsMode.value === "bank") {
      return selectedBankQuestions.value.length > 0;
    } else {
      return (
        formData.value.questions.length > 0 &&
        formData.value.questions.every(
          (q) => q.text.trim() !== "" && q.options.length >= 2 && q.options.every((o) => o.text.trim() !== "") && q.options.some((o) => o.isCorrect)
        )
      );
    }
  }
  if (currentStep.value === 3) {
    return formData.value.branchIds.length > 0 || formData.value.positionIds.length > 0 || formData.value.userIds.length > 0;
  }
  return true;
});

const isFormValid = computed(() => {
  const hasQuestions = questionsMode.value === "bank" ? selectedBankQuestions.value.length > 0 : formData.value.questions.length > 0;

  return (
    formData.value.title.trim() !== "" &&
    formData.value.openAt !== "" &&
    formData.value.closeAt !== "" &&
    hasQuestions &&
    (formData.value.branchIds.length > 0 || formData.value.positionIds.length > 0 || formData.value.userIds.length > 0)
  );
});

const getManagerBranchIds = (branches = []) => {
  const user = authStore.user || {};
  if (Array.isArray(user.branch_ids) && user.branch_ids.length) {
    return user.branch_ids.map((id) => Number(id));
  }
  if (Array.isArray(user.branches) && user.branches.length) {
    return user.branches
      .map((branch) => (typeof branch === "object" ? branch.id : branch))
      .filter((id) => id !== undefined)
      .map((id) => Number(id));
  }
  if (Array.isArray(branches) && branches.length) {
    return branches.map((branch) => branch.id);
  }
  if (user.branch_id) {
    return [Number(user.branch_id)];
  }
  return [];
};

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = data;

    if (authStore.isManager) {
      const allowedBranches = getManagerBranchIds(data?.branches);
      if (allowedBranches.length) {
        formData.value.branchIds = [...new Set(allowedBranches)];
      }
    }
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadCategories = async () => {
  try {
    const data = await getCategories();
    categories.value = data.categories || [];
  } catch (error) {
    console.error("Load categories error:", error);
  }
};

const searchBankQuestions = async () => {
  loadingBankQuestions.value = true;
  try {
    const filters = {};
    if (questionSearch.value) filters.search = questionSearch.value;
    if (selectedCategory.value) filters.category_id = selectedCategory.value;

    const data = await getQuestions(filters);
    bankQuestions.value = data.questions || [];
  } catch (error) {
    console.error("Load bank questions error:", error);
  } finally {
    loadingBankQuestions.value = false;
  }
};

const isQuestionSelected = (questionId) => {
  return selectedBankQuestions.value.some((q) => q.id === questionId);
};

const toggleBankQuestion = (question) => {
  const index = selectedBankQuestions.value.findIndex((q) => q.id === question.id);
  if (index > -1) {
    selectedBankQuestions.value.splice(index, 1);
  } else {
    selectedBankQuestions.value.push(question);
  }
};

const searchUsers = async () => {
  if (!allUsers.value.length) {
    try {
      const { users } = await getUsers({});
      allUsers.value = users;
    } catch (error) {
      console.error("Load users error:", error);
    }
  }
};

const addQuestion = () => {
  formData.value.questions.push({
    text: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  });
};

const removeQuestion = (index) => {
  formData.value.questions.splice(index, 1);
};

const addOption = (qIndex) => {
  if (formData.value.questions[qIndex].options.length < 6) {
    formData.value.questions[qIndex].options.push({
      text: "",
      isCorrect: false,
    });
  }
};

const removeOption = (qIndex, oIndex) => {
  if (formData.value.questions[qIndex].options.length > 2) {
    formData.value.questions[qIndex].options.splice(oIndex, 1);
  }
};

const setCorrectOption = (qIndex, oIndex) => {
  formData.value.questions[qIndex].options.forEach((opt, idx) => {
    opt.isCorrect = idx === oIndex;
  });
};

const nextStep = () => {
  if (canProceed.value && currentStep.value < 4) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const validateDateField = (fieldName) => {
  const value = formData.value[fieldName];
  let error = null;

  // Валидация самой даты
  const validation = validateDate(value);
  if (!validation.isValid) {
    errors.value[fieldName] = validation.error;
    return;
  }

  // Валидация диапазона дат
  if (fieldName === "closeAt" && formData.value.openAt) {
    const rangeValidation = validateDateRange(formData.value.openAt, formData.value.closeAt);
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

const validateNumberField = (fieldName, minValue, maxValue) => {
  const value = formData.value[fieldName];
  let error = null;

  if (value === "" || value === null) {
    error = "Поле обязательно";
  } else if (isNaN(Number(value))) {
    error = "Должно быть числом";
  } else if (minValue !== null && Number(value) < minValue) {
    error = `Минимальное значение: ${minValue}`;
  } else if (maxValue !== null && Number(value) > maxValue) {
    error = `Максимальное значение: ${maxValue}`;
  }

  if (error) {
    errors.value[fieldName] = error;
  } else {
    delete errors.value[fieldName];
  }
};

const submitAssessment = async () => {
  // Валидация всех критических полей
  validateDateField("openAt");
  validateDateField("closeAt");
  validateNumberField("timeLimitMinutes", 1, null);
  validateNumberField("passScorePercent", 0, 100);
  validateNumberField("maxAttempts", 1, null);

  if (Object.keys(errors.value).length > 0) {
    alert("Пожалуйста, исправьте ошибки в форме");
    return;
  }

  if (!isFormValid.value) {
    alert("Пожалуйста, заполните все обязательные поля");
    return;
  }

  // Проверка наличия вопросов
  const hasQuestions =
    questionsMode.value === "bank"
      ? selectedBankQuestions.value && selectedBankQuestions.value.length > 0
      : formData.value.questions && formData.value.questions.length > 0;

  if (!hasQuestions) {
    alert("Добавьте хотя бы один вопрос для аттестации");
    return;
  }

  submitting.value = true;
  try {
    // Преобразуем даты в формат с временем 00:00
    const transformBankQuestion = (question) => ({
      question_id: question.id,
      text: question.question_text,
      options: (question.options || []).map((opt) => ({
        text: opt.option_text,
        isCorrect: opt.is_correct === 1,
      })),
    });

    const assessmentData = {
      ...formData.value,
      openAt: dateToISOWithMidnight(formData.value.openAt),
      closeAt: dateToISOWithMidnight(formData.value.closeAt),
      questions:
        questionsMode.value === "bank"
          ? (selectedBankQuestions.value || []).map(transformBankQuestion)
          : formData.value.questions,
    };

    await createAssessment(assessmentData);
    alert("Аттестация успешно создана!");
    emit("submit");
  } catch (error) {
    console.error("Create assessment error:", error);
    alert(error.response?.data?.error || "Ошибка создания аттестации");
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadReferences();
  loadCategories();
  searchBankQuestions();
});
</script>

<style scoped>
.assessment-wizard {
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-height: 500px;
}

/* Steps Progress */
.wizard-steps {
  display: flex;
  justify-content: space-between;
  position: relative;
  padding: 0 32px;
}

.wizard-steps::before {
  content: "";
  position: absolute;
  top: 20px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--divider);
  z-index: 0;
}

.wizard-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 2px solid var(--divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.3s;
}

.wizard-step.active .step-number {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}

.wizard-step.completed .step-number {
  background: var(--accent-green);
  border-color: var(--accent-green);
  color: white;
}

.step-label {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 120px;
}

.wizard-step.active .step-label {
  color: var(--text-primary);
  font-weight: 600;
}

/* Content */
.wizard-content {
  flex: 1;
  padding: 32px;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--divider);
  min-height: 400px;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* Form Elements */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--accent-red);
}

.form-input {
  padding: 12px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  font-size: 15px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Questions Mode */
.questions-mode-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.mode-tab {
  flex: 1;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.mode-tab:hover {
  background: var(--bg-primary);
}

.mode-tab.active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}

/* Bank Questions */
.bank-questions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bank-header {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.loading-state {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
}

.bank-questions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--divider);
  border-radius: 8px;
}

.bank-question-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-primary);
}

.bank-question-item:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-blue);
}

.bank-question-item.selected {
  background: #007aff14;
  border-color: var(--accent-blue);
}

.question-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.question-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.question-content {
  flex: 1;
}

.question-text {
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.question-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.question-category {
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.question-options {
  padding: 4px 8px;
}

/* Custom Questions */
.custom-questions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selected-count {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 15px;
  color: var(--text-secondary);
}

.selected-count strong {
  color: var(--accent-blue);
  font-weight: 600;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card {
  padding: 24px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.btn-remove {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 20px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-remove:hover {
  background: #ff3b301f;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  cursor: pointer;
}

.btn-remove-small {
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--accent-red);
  border-radius: 4px;
}

.btn-remove-small:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-add-option {
  margin-top: 8px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border: 1px dashed var(--divider);
  border-radius: 6px;
  cursor: pointer;
  color: var(--accent-blue);
  font-size: 14px;
  transition: all 0.2s;
}

.btn-add-option:hover:not(:disabled) {
  border-color: var(--accent-blue);
  background: var(--accent-blue-soft);
}

.btn-add-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Assignment */
.assignment-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.tab-button:hover {
  background: var(--bg-primary);
}

.tab-button.active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}

.assignment-content {
  margin-top: 16px;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.checkbox-item:hover {
  background: var(--bg-secondary);
}

.users-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--divider);
  border-radius: 8px;
  padding: 8px;
}

.selected-summary {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

/* Preview */
.preview-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--divider);
}

.preview-section h4 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.preview-card {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.preview-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.preview-value {
  color: var(--text-primary);
  text-align: right;
}

/* Navigation */
.wizard-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid var(--divider);
}

.spacer {
  flex: 1;
}

.empty-state {
  padding: 48px 32px;
  text-align: center;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .wizard-steps {
    padding: 0;
  }

  .step-label {
    font-size: 12px;
    max-width: 80px;
  }

  .step-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .wizard-content {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .assignment-tabs {
    flex-direction: column;
  }
}

/* Checkbox styling */
.checkbox-group {
  margin-bottom: 16px;
}

.group-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: var(--bg-primary);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  flex: 1;
  color: var(--text-primary);
  font-size: 14px;
}

.correct-option-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.correct-option-label input[type="radio"] {
  cursor: pointer;
}

.correct-option-label span {
  font-size: 14px;
  color: var(--text-primary);
}
</style>
