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

      <!-- Шаг 2: Теория -->
      <div v-else-if="currentStep === 2" class="step-content">
        <h3 class="step-title">Теория перед тестом</h3>
        <p class="hint">Сделайте прохождение теории обязательным перед началом попытки.</p>

        <label class="theory-toggle">
          <input type="checkbox" v-model="theoryEnabled" />
          <span>Требовать прохождение теории перед тестом</span>
        </label>

        <div v-if="theoryEnabled" class="theory-builder-wrapper">
          <AssessmentTheoryBuilder v-model="theoryData" />
          <p v-if="theoryError" class="error-text">{{ theoryError }}</p>
        </div>

        <p v-else class="text-secondary">Вы можете включить теорию в любой момент после создания аттестации.</p>
      </div>

      <!-- Шаг 3: Вопросы -->
      <div v-else-if="currentStep === 3" class="step-content">
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

              <div class="question-type-toggle">
                <label v-for="typeOption in questionTypeOptions" :key="typeOption.value" class="type-option">
                  <input
                    type="radio"
                    :value="typeOption.value"
                    :checked="question.questionType === typeOption.value"
                    @change="() => handleQuestionTypeChange(qIndex, typeOption.value)"
                  />
                  <span>{{ typeOption.label }}</span>
                </label>
              </div>
              <p class="hint">
                <template v-if="question.questionType === 'single'">Один правильный вариант из списка</template>
                <template v-else-if="question.questionType === 'multiple'">Несколько правильных вариантов</template>
                <template v-else-if="question.questionType === 'matching'">Сопоставление элементов</template>
                <template v-else>Сотрудник вводит текст, который сравнивается с эталонным</template>
              </p>

              <Textarea
                v-if="question.questionType === 'text'"
                v-model="question.correctTextAnswer"
                label="Эталонный ответ"
                :rows="2"
                placeholder="Введите правильный ответ"
              />

              <div v-else class="form-group">
                <label>Варианты ответов (2-6)</label>
                <div class="options-list">
                  <div v-for="(option, oIndex) in question.options" :key="oIndex" class="option-row">
                    <template v-if="question.questionType === 'matching'">
                      <Input v-model="option.text" type="text" placeholder="Левая колонка" />
                      <Input v-model="option.matchText" type="text" placeholder="Правая колонка" />
                    </template>
                    <template v-else>
                      <Input v-model="option.text" type="text" placeholder="Текст варианта" />
                      <label class="correct-option-label">
                        <template v-if="question.questionType === 'multiple'">
                          <input type="checkbox" v-model="option.isCorrect" />
                        </template>
                        <template v-else>
                          <input type="radio" :name="`question-${qIndex}`" :checked="option.isCorrect" @change="() => setCorrectOption(qIndex, oIndex)" />
                        </template>
                        <span>Правильный</span>
                      </label>
                    </template>
                    <Button @click="removeOption(qIndex, oIndex)" :disabled="question.options.length <= 2" variant="danger" size="sm" icon="trash" />
                  </div>
                </div>
                <Button @click="addOption(qIndex)" :disabled="question.options.length >= 6" variant="secondary">+ Добавить вариант</Button>
                <p class="hint">
                  <template v-if="question.questionType === 'single'">Отметьте один правильный ответ</template>
                  <template v-else-if="question.questionType === 'multiple'">Отметьте минимум 2 правильных ответа</template>
                  <template v-else>Заполните все пары</template>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Шаг 4: Участники -->
      <div v-else-if="currentStep === 4" class="step-content">
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
                <span>{{ formatBranchLabel(branch) }}</span>
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

      <!-- Шаг 5: Параметры и даты -->
      <div v-else-if="currentStep === 5" class="step-content">
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
              <span class="preview-value">{{ questionsCount }}</span>
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

      <Button v-if="currentStep < steps.length" @click="nextStep" :disabled="!canProceed">Далее</Button>

      <Button v-else @click="submitAssessment" :loading="submitting" :disabled="!isFormValid" icon="check">{{ submitLabel }}</Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "../stores/auth";
import { createAssessment, updateAssessment } from "../api/assessments";
import { getReferences, getUsers } from "../api/users";
import { getQuestions, getCategories } from "../api/questionBank";
import { validateDate, validateDateRange, dateToISOWithMidnight } from "../utils/dateValidation";
import Button from "./ui/Button.vue";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Select from "./ui/Select.vue";
import Textarea from "./ui/Textarea.vue";
import AssessmentTheoryBuilder from "./AssessmentTheoryBuilder.vue";
import { getAdminTheory, saveTheoryDraft, publishTheory } from "../api/theory";
import { createEmptyTheory, validateTheoryData, buildTheoryPayload, hasTheoryBlocks, mapVersionToTheoryData } from "../utils/theory";
import { useToast } from "../composables/useToast";
import { formatBranchLabel } from "../utils/branch";

const props = defineProps({
  mode: {
    type: String,
    default: "create",
  },
  initialAssessment: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["submit", "cancel"]);
const authStore = useAuthStore();

const isEditMode = computed(() => props.mode === "edit");
const loading = ref(false);
const submitting = ref(false);
const currentStep = ref(1);
const assignmentMode = ref("branches");
const questionsMode = ref("bank");
const errors = ref({});

const steps = [{ label: "Основная информация" }, { label: "Теория" }, { label: "Вопросы" }, { label: "Участники" }, { label: "Параметры" }];
const questionTypeOptions = [
  { value: "single", label: "Одиночный" },
  { value: "multiple", label: "Множественный" },
  { value: "text", label: "Эталонный ответ" },
  { value: "matching", label: "Сопоставление" },
];

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
const { showToast } = useToast();
const userSearchQuery = ref("");
const theoryEnabled = ref(false);
const theoryData = ref(createEmptyTheory());
const theoryError = ref("");
const filteredUsers = computed(() => {
  if (!userSearchQuery.value) return allUsers.value;
  const query = userSearchQuery.value.toLowerCase();
  return allUsers.value.filter((user) => user.first_name.toLowerCase().includes(query) || user.last_name.toLowerCase().includes(query));
});
const questionsCount = computed(() => (questionsMode.value === "bank" ? selectedBankQuestions.value.length : formData.value.questions.length));
const submitLabel = computed(() => (isEditMode.value ? "Сохранить изменения" : "Создать аттестацию"));

const validateTheory = (showMessage = false) => {
  if (!theoryEnabled.value) {
    theoryError.value = "";
    return true;
  }
  const result = validateTheoryData(theoryData.value);
  if (!result.valid) {
    if (showMessage) {
      theoryError.value = result.message;
      showToast(result.message, "warning");
    }
    return false;
  }
  theoryError.value = "";
  return true;
};

const persistTheoryVersion = async (assessmentId) => {
  if (!theoryEnabled.value || !hasTheoryBlocks(theoryData.value)) {
    return;
  }
  const payload = buildTheoryPayload(theoryData.value);
  await saveTheoryDraft(assessmentId, payload);
  await publishTheory(assessmentId, "new");
};

const formatDateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const mapAssessmentQuestionToForm = (question) => {
  const questionType = question.question_type || question.questionType || (question.correct_text_answer || question.correctTextAnswer ? "text" : "single");
  const correctText = question.correct_text_answer || question.correctTextAnswer || "";
  const options = questionType === "text" ? [] : (question.options || []).map((opt) => ({
    text: opt.option_text || opt.text || "",
    matchText: opt.match_text || opt.matchText || "",
    isCorrect: opt.is_correct === 1 || opt.isCorrect === true,
  }));

  return {
    text: question.question_text || question.text || "",
    questionType,
    correctTextAnswer: correctText,
    _typeCache: {
      text: { correctTextAnswer: correctText },
      single: { options: [] },
      multiple: { options: [] },
      matching: { options: [] },
    },
    options,
  };
};

const mapAssessmentQuestionToBank = (question) => {
  const questionType = question.question_type || question.questionType || "single";
  const bankId = question.questionBankId || question.question_bank_id;
  return {
    id: bankId,
    question_text: question.question_text || question.text || "",
    question_type: questionType,
    correct_text_answer: question.correct_text_answer || question.correctTextAnswer || "",
    options:
      questionType === "text"
        ? []
        : (question.options || []).map((opt, idx) => ({
            id: opt.id || `${bankId || question.id}-${idx + 1}`,
            option_text: opt.option_text || opt.text || "",
            match_text: opt.match_text || opt.matchText || "",
            is_correct: opt.is_correct === 1 || opt.isCorrect === true ? 1 : 0,
            order_index: opt.order_index || opt.order || idx + 1,
          })),
  };
};

const applyInitialAssessment = (assessment) => {
  formData.value = {
    title: assessment.title || "",
    description: assessment.description || "",
    openAt: formatDateForInput(assessment.open_at || assessment.openAt),
    closeAt: formatDateForInput(assessment.close_at || assessment.closeAt),
    timeLimitMinutes: assessment.time_limit_minutes ?? assessment.timeLimitMinutes ?? 30,
    passScorePercent: assessment.pass_score_percent ?? assessment.passScorePercent ?? 70,
    maxAttempts: assessment.max_attempts ?? assessment.maxAttempts ?? 3,
    branchIds: (assessment.accessibility?.branches || []).map((branch) => branch.id),
    positionIds: (assessment.accessibility?.positions || []).map((position) => position.id),
    userIds: (assessment.accessibility?.users || []).map((user) => user.id),
    questions: [],
  };

  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  const bankQuestions = questions.filter((question) => question.questionBankId || question.question_bank_id);
  const customQuestions = questions.filter((question) => !question.questionBankId && !question.question_bank_id);

  if (bankQuestions.length === questions.length && bankQuestions.length > 0) {
    questionsMode.value = "bank";
    selectedBankQuestions.value = bankQuestions.map((question) => mapAssessmentQuestionToBank(question));
  } else {
    questionsMode.value = "custom";
    selectedBankQuestions.value = [];
    formData.value.questions = customQuestions.map((question) => mapAssessmentQuestionToForm(question));
  }

  formData.value.questions.forEach((question) => {
    if (question.questionType === "text") {
      question._typeCache.text.correctTextAnswer = question.correctTextAnswer || "";
    } else {
      const cachedOptions = (question.options || []).map((opt) => ({
        text: opt.text || "",
        matchText: opt.matchText || "",
        isCorrect: Boolean(opt.isCorrect),
      }));
      question._typeCache[question.questionType] = { options: cachedOptions };
    }
  });

  if (formData.value.userIds.length > 0) {
    assignmentMode.value = "users";
  } else if (formData.value.positionIds.length > 0) {
    assignmentMode.value = "positions";
  } else {
    assignmentMode.value = "branches";
  }
};

const loadTheoryForEdit = async (assessmentId) => {
  if (!assessmentId) return;
  try {
    const response = await getAdminTheory(assessmentId);
    const theory = response?.theory || null;
    const version = theory?.draftVersion || theory?.currentVersion || null;
    if (version && (version.requiredBlocks?.length || version.optionalBlocks?.length)) {
      theoryEnabled.value = true;
      theoryData.value = mapVersionToTheoryData(version);
    } else {
      theoryEnabled.value = false;
      theoryData.value = createEmptyTheory();
    }
  } catch (error) {
    console.error("Load theory error:", error);
    theoryEnabled.value = false;
    theoryData.value = createEmptyTheory();
  }
};

const categoryOptions = computed(() => [
  { value: "", label: "Все категории" },
  ...categories.value.map((cat) => ({
    value: String(cat.id),
    label: cat.name,
  })),
]);

watch(
  theoryEnabled,
  (enabled) => {
    if (enabled && !hasTheoryBlocks(theoryData.value)) {
      theoryData.value = createEmptyTheory();
    }
    if (!enabled) {
      theoryError.value = "";
    }
  },
  { immediate: false }
);

const MAX_YEAR_OFFSET = 100;
// Максимальная дата (текущий год + 100)
const maxDate = ref(calculateMaxDate());

function calculateMaxDate() {
  const currentYear = new Date().getFullYear();
  return `${currentYear + MAX_YEAR_OFFSET}-12-31`;
}

const isQuestionValid = (question) => {
  if (!question || !question.text || question.text.trim() === "") {
    return false;
  }
  if (question.questionType === "text") {
    return Boolean(question.correctTextAnswer && question.correctTextAnswer.trim().length > 0);
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    return false;
  }
  if (
    !question.options.every((opt) =>
      question.questionType === "matching"
        ? opt.text && opt.text.trim().length > 0 && opt.matchText && opt.matchText.trim().length > 0
        : opt.text && opt.text.trim().length > 0
    )
  ) {
    return false;
  }
  const correctCount = question.options.filter((opt) => opt.isCorrect).length;
  if (question.questionType === "single") {
    return correctCount === 1;
  }
  if (question.questionType === "multiple") {
    return correctCount >= 2;
  }
  return question.questionType === "matching";
};

const areCustomQuestionsValid = () => {
  if (!formData.value.questions.length) {
    return false;
  }
  return formData.value.questions.every((question) => isQuestionValid(question));
};

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return formData.value.title.trim() !== "";
    case 2: {
      if (!theoryEnabled.value) {
        return true;
      }
      const result = validateTheoryData(theoryData.value);
      return result.valid;
    }
    case 3:
      if (questionsMode.value === "bank") {
        return selectedBankQuestions.value.length > 0;
      }
      return areCustomQuestionsValid();
    case 4:
      return formData.value.branchIds.length > 0 || formData.value.positionIds.length > 0 || formData.value.userIds.length > 0;
    default:
      return true;
  }
});

const isFormValid = computed(() => {
  const hasBankQuestions = selectedBankQuestions.value.length > 0;
  const hasCustomQuestions = formData.value.questions.length > 0;
  const hasQuestions = questionsMode.value === "bank" ? hasBankQuestions : hasCustomQuestions;
  const customValid = questionsMode.value === "bank" ? true : areCustomQuestionsValid();
  const theoryValid = !theoryEnabled.value || validateTheoryData(theoryData.value).valid;

  return (
    formData.value.title.trim() !== "" &&
    formData.value.openAt !== "" &&
    formData.value.closeAt !== "" &&
    hasQuestions &&
    customValid &&
    theoryValid &&
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

    if (authStore.isManager && (!isEditMode.value || formData.value.branchIds.length === 0)) {
      const allowedBranches = getManagerBranchIds(data?.branches);
      if (allowedBranches.length) {
        formData.value.branchIds = [...new Set(allowedBranches)];
      }
    }
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadUsers = async () => {
  try {
    const { users } = await getUsers({});
    allUsers.value = users || [];
  } catch (error) {
    console.error("Load users error:", error);
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

const createDefaultOptions = () => [
  { text: "", matchText: "", isCorrect: true },
  { text: "", matchText: "", isCorrect: false },
];

const addQuestion = () => {
  formData.value.questions.push({
    text: "",
    questionType: "single",
    correctTextAnswer: "",
    _typeCache: {
      text: { correctTextAnswer: "" },
      single: { options: [] },
      multiple: { options: [] },
      matching: { options: [] },
    },
    options: createDefaultOptions(),
  });
};

const removeQuestion = (index) => {
  formData.value.questions.splice(index, 1);
};

const addOption = (qIndex) => {
  const question = formData.value.questions[qIndex];
  if (!question || question.questionType === "text") {
    return;
  }
  if (question.options.length < 6) {
    question.options.push({
      text: "",
      matchText: "",
      isCorrect: false,
    });
  }
};

const removeOption = (qIndex, oIndex) => {
  const question = formData.value.questions[qIndex];
  if (!question || question.questionType === "text") {
    return;
  }
  if (question.options.length > 2) {
    question.options.splice(oIndex, 1);
  }
};

const setCorrectOption = (qIndex, oIndex) => {
  const question = formData.value.questions[qIndex];
  if (!question || question.questionType !== "single") {
    return;
  }
  question.options.forEach((opt, idx) => {
    opt.isCorrect = idx === oIndex;
  });
};

const handleQuestionTypeChange = (qIndex, type) => {
  const question = formData.value.questions[qIndex];
  if (!question) {
    return;
  }
  const cache = question._typeCache || {
    text: { correctTextAnswer: "" },
    single: { options: [] },
    multiple: { options: [] },
    matching: { options: [] },
  };
  if (question.questionType === "text") {
    cache.text.correctTextAnswer = question.correctTextAnswer || "";
  } else {
    cache[question.questionType] = {
      options: (question.options || []).map((option) => ({
        text: option.text || "",
        matchText: option.matchText || "",
        isCorrect: Boolean(option.isCorrect),
      })),
    };
  }
  question._typeCache = cache;
  question.questionType = type;
  if (type === "text") {
    question.options = [];
    question.correctTextAnswer = cache.text.correctTextAnswer || "";
    return;
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    const cachedOptions = cache[type]?.options;
    question.options =
      cachedOptions && cachedOptions.length ? cachedOptions.map((opt) => ({ ...opt })) : createDefaultOptions();
  }
  question.correctTextAnswer = "";
  if (type === "single") {
    const cachedOptions = cache.single?.options;
    if (cachedOptions && cachedOptions.length) {
      question.options = cachedOptions.map((opt) => ({ ...opt }));
    }
    let hasCorrect = false;
    question.options.forEach((option) => {
      if (option.isCorrect && !hasCorrect) {
        hasCorrect = true;
      } else {
        option.isCorrect = false;
      }
    });
    if (!hasCorrect) {
      question.options[0].isCorrect = true;
    }
  } else if (type === "multiple") {
    const cachedOptions = cache.multiple?.options;
    if (cachedOptions && cachedOptions.length) {
      question.options = cachedOptions.map((opt) => ({ ...opt }));
    }
    const correctCount = question.options.filter((opt) => opt.isCorrect).length;
    if (correctCount < 2) {
      question.options.forEach((option, idx) => {
        option.isCorrect = idx < 2;
      });
    }
  } else if (type === "matching") {
    const cachedOptions = cache.matching?.options;
    question.options =
      cachedOptions && cachedOptions.length
        ? cachedOptions.map((opt) => ({ ...opt, isCorrect: false }))
        : question.options.map((option) => ({
            text: option.text || "",
            matchText: option.matchText || "",
            isCorrect: false,
          }));
  }
};

const mapCustomQuestion = (question) => {
  const questionType = question.questionType || "single";
  return {
    questionBankId: question.questionBankId || null,
    text: question.text.trim(),
    questionType,
    correctTextAnswer: questionType === "text" ? (question.correctTextAnswer || "").trim() : "",
    options:
      questionType === "text"
        ? []
        : (question.options || []).map((option) => ({
            text: option.text.trim(),
            matchText: option.matchText ? option.matchText.trim() : "",
            isCorrect: Boolean(option.isCorrect),
          })),
  };
};

const getCustomQuestionsPayload = () => formData.value.questions.map((question) => mapCustomQuestion(question));

const nextStep = () => {
  if (currentStep.value === 2 && !validateTheory(true)) {
    return;
  }
  if (canProceed.value && currentStep.value < steps.length) {
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
    showToast("Пожалуйста, исправьте ошибки в форме", "warning");
    return;
  }

  if (!isFormValid.value) {
    showToast("Пожалуйста, заполните все обязательные поля", "warning");
    return;
  }

  // Проверка наличия вопросов
  const hasQuestions =
    questionsMode.value === "bank"
      ? selectedBankQuestions.value && selectedBankQuestions.value.length > 0
      : formData.value.questions && formData.value.questions.length > 0;

  if (!hasQuestions) {
    showToast("Добавьте хотя бы один вопрос для аттестации", "warning");
    return;
  }

  if (questionsMode.value === "custom" && !areCustomQuestionsValid()) {
    showToast("Проверьте текст вопросов и варианты ответов", "warning");
    return;
  }

  if (!validateTheory(true)) {
    return;
  }

  submitting.value = true;
  try {
    // Преобразуем даты в формат с временем 00:00
    const transformBankQuestion = (question) => {
      const questionType = question.question_type || question.questionType || "single";
      return {
        questionBankId: question.id,
        text: question.question_text || question.text || "",
        questionType,
        correctTextAnswer: questionType === "text" ? (question.correct_text_answer || question.correctTextAnswer || "") : "",
        options:
          questionType === "text"
            ? []
            : (question.options || []).map((opt) => ({
                text: opt.option_text || opt.text || "",
                matchText: opt.match_text || opt.matchText || "",
                isCorrect: opt.is_correct === 1 || opt.isCorrect === true,
              })),
      };
    };

    const assessmentData = {
      ...formData.value,
      openAt: dateToISOWithMidnight(formData.value.openAt),
      closeAt: dateToISOWithMidnight(formData.value.closeAt),
      questions:
        questionsMode.value === "bank"
          ? (selectedBankQuestions.value || []).map(transformBankQuestion)
          : getCustomQuestionsPayload(),
    };

    const result = isEditMode.value
      ? await updateAssessment(props.initialAssessment.id, assessmentData)
      : await createAssessment(assessmentData);
    const createdAssessmentId = isEditMode.value ? props.initialAssessment.id : result?.assessmentId ?? result?.assessment?.id;

    if (theoryEnabled.value && hasTheoryBlocks(theoryData.value) && createdAssessmentId) {
      try {
        await persistTheoryVersion(createdAssessmentId);
      } catch (error) {
        console.error("Theory creation error:", error);
        showToast("Аттестация создана, но сохранить теорию не удалось. Настройте теорию позже.", "warning");
      }
    }

    showToast(isEditMode.value ? "Аттестация успешно обновлена!" : "Аттестация успешно создана!", "success");
    emit("submit");
  } catch (error) {
    console.error("Create assessment error:", error);
    showToast(error.response?.data?.error || "Ошибка создания аттестации", "error");
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadReferences(), loadCategories()]);

  if (isEditMode.value && props.initialAssessment) {
    applyInitialAssessment(props.initialAssessment);
    await loadUsers();
    await loadTheoryForEdit(props.initialAssessment.id);
  }

  await searchBankQuestions();
  loading.value = false;
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

.question-type-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 4px;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--divider);
  border-radius: 999px;
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.type-option input {
  margin: 0;
}

.type-option input:checked + span {
  color: var(--accent-blue);
  font-weight: 600;
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

.theory-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  margin-bottom: 16px;
}

.theory-toggle input {
  width: 18px;
  height: 18px;
}

.theory-builder-wrapper {
  margin-top: 16px;
}

.error-text {
  color: #ef4444;
  margin-top: 12px;
}

.text-secondary {
  color: var(--text-secondary);
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
