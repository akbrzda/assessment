<template>
  <div class="assessment-edit-form">
    <Card padding="lg">
      <Preloader v-if="loading" />

      <div v-else>
        <!-- Предупреждение для открытых/закрытых аттестаций -->
        <div v-if="!canEditParameters" class="warning-banner">
          <p class="warning-title">⚠️ Аттестация уже открыта</p>
          <p class="warning-text">
            Вы можете редактировать только вопросы и теорию. Параметры (порог прохождения, количество попыток, время на прохождение, назначения)
            изменить нельзя.
          </p>
        </div>

        <!-- Основная информация -->
        <section class="form-section">
          <h3 class="section-title">Основная информация</h3>

          <Input v-model="formData.title" type="text" label="Название" placeholder="Название аттестации" required />

          <Textarea v-model="formData.description" label="Описание" :rows="3" placeholder="Описание аттестации" />
        </section>

        <!-- Параметры -->
        <section class="form-section">
          <h3 class="section-title">Параметры</h3>

          <div class="form-grid">
            <Input v-model="formData.openAt" type="date" label="Дата открытия" required />

            <Input v-model="formData.closeAt" type="date" label="Дата закрытия" required />

            <Input
              v-model="formData.timeLimitMinutes"
              type="number"
              label="Время на прохождение (мин)"
              :min="1"
              :disabled="!canEditParameters"
              required
            />

            <Input
              v-model="formData.passScorePercent"
              type="number"
              label="Проходной балл (%)"
              :min="0"
              :max="100"
              :disabled="!canEditParameters"
              required
            />

            <Input v-model="formData.maxAttempts" type="number" label="Максимум попыток" :min="1" :max="3" :disabled="!canEditParameters" required />
          </div>
        </section>

        <!-- Теория -->
        <section class="form-section">
          <div class="theory-section-header">
            <div>
              <h3 class="section-title">Теория перед аттестацией</h3>
              <p class="section-hint">Добавьте обязательные материалы, которые сотрудник должен изучить перед тестом.</p>
            </div>
            <label class="switch-field">
              <input type="checkbox" v-model="theoryEnabled" />
              <span>Требовать прохождение теории</span>
            </label>
          </div>

          <div v-if="theoryLoading" class="inline-loading">
            <Preloader />
          </div>

          <div v-else>
            <div v-if="theoryEnabled" class="theory-builder-wrapper">
              <AssessmentTheoryBuilder v-model="theoryData" />
              <p v-if="theoryError" class="error-text">{{ theoryError }}</p>
            </div>
            <p v-else class="hint text-secondary">Теория отключена. Включите переключатель, чтобы добавить блоки.</p>
          </div>
        </section>

        <!-- Назначения -->
        <section v-if="canEditParameters" class="form-section">
          <h3 class="section-title">Назначение</h3>

          <div class="form-group">
            <label>Филиалы</label>
            <div class="checkbox-group">
              <label v-for="branch in references.branches" :key="branch.id" class="checkbox-label">
                <input type="checkbox" :value="branch.id" v-model="selectedBranches" />
                <span>{{ formatBranchLabel(branch) }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Должности</label>
            <div class="checkbox-group">
              <label v-for="position in references.positions" :key="position.id" class="checkbox-label">
                <input type="checkbox" :value="position.id" v-model="selectedPositions" />
                <span>{{ position.name }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Конкретные сотрудники</label>
            <Input v-model="userSearchQuery" placeholder="Поиск сотрудников..." />
            <div class="checkbox-group">
              <label v-for="user in filteredUsers" :key="user.id" class="checkbox-label">
                <input type="checkbox" :value="user.id" v-model="selectedUsers" />
                <span>{{ user.first_name }} {{ user.last_name }}</span>
              </label>
            </div>
          </div>

          <!-- Предпросмотр назначенных пользователей -->
          <div v-if="assignedUsersPreview.length > 0" class="assigned-preview">
            <div class="preview-header">
              <strong>Будет назначено пользователей: {{ assignedUsersPreview.length }}</strong>
            </div>
            <div class="preview-list">
              <div v-for="user in assignedUsersPreview.slice(0, 10)" :key="user.id" class="preview-user">
                {{ user.first_name }} {{ user.last_name }} — {{ user.position_name || "без должности" }} ({{ user.branch_name || "без филиала" }})
              </div>
              <div v-if="assignedUsersPreview.length > 10" class="preview-more">И ещё {{ assignedUsersPreview.length - 10 }} пользователей...</div>
            </div>
          </div>
        </section>

        <!-- Вопросы -->
        <section class="form-section">
          <h3 class="section-title">Вопросы ({{ formData.questions.length }})</h3>

          <div v-if="formData.questions.length === 0" class="empty-state">
            <p>Нет вопросов</p>
          </div>

          <div v-else class="questions-list">
            <Card v-for="(question, qIndex) in formData.questions" :key="qIndex" class="question-card" padding="md">
              <div class="question-header">
                <h4>Вопрос {{ qIndex + 1 }}</h4>
                <Button size="sm" variant="danger" icon="trash" @click="removeQuestion(qIndex)">Удалить</Button>
              </div>

              <Input v-model="question.text" label="Текст вопроса" placeholder="Введите текст вопроса" required />

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
                  <div v-for="(option, oIndex) in question.options" :key="oIndex" class="option-item">
                    <template v-if="question.questionType === 'matching'">
                      <Input v-model="option.text" placeholder="Левая колонка" required />
                      <Input v-model="option.matchText" placeholder="Правая колонка" required />
                    </template>
                    <template v-else>
                      <Input v-model="option.text" placeholder="Вариант ответа" required />
                      <label class="checkbox-label">
                        <input v-if="question.questionType === 'multiple'" type="checkbox" v-model="option.isCorrect" />
                        <input
                          v-else
                          type="radio"
                          :name="`correct-${qIndex}`"
                          :checked="option.isCorrect"
                          @change="() => setCorrectOption(qIndex, oIndex)"
                        />
                        <span>Правильный</span>
                      </label>
                    </template>
                    <Button size="sm" variant="danger" icon="x" @click="removeOption(qIndex, oIndex)" />
                  </div>
                </div>
                <Button size="sm" variant="secondary" icon="plus" @click="addOption(qIndex)">Добавить вариант</Button>
                <p class="hint">
                  <template v-if="question.questionType === 'single'">Отметьте один правильный ответ</template>
                  <template v-else-if="question.questionType === 'multiple'">Отметьте минимум 2 правильных ответа</template>
                  <template v-else>Заполните все пары</template>
                </p>
              </div>
            </Card>
          </div>

          <Button icon="plus" @click="addQuestion">Добавить вопрос</Button>
        </section>

        <!-- Кнопки действий -->
        <div class="form-actions">
          <Button variant="secondary" @click="$emit('cancel')">Отмена</Button>
          <Button variant="primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? "Сохранение..." : "Сохранить изменения" }}
          </Button>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { updateAssessment } from "../api/assessments";
import { getReferences, getUsers } from "../api/users";
import { getAdminTheory, saveTheoryDraft, publishTheory } from "../api/theory";
import Card from "./ui/Card.vue";
import Input from "./ui/Input.vue";
import Textarea from "./ui/Textarea.vue";
import Button from "./ui/Button.vue";
import Preloader from "./ui/Preloader.vue";
import AssessmentTheoryBuilder from "./AssessmentTheoryBuilder.vue";
import { useToast } from "../composables/useToast";
import { createEmptyTheory, mapVersionToTheoryData, buildTheoryPayload, validateTheoryData, hasTheoryBlocks } from "../utils/theory";
import { formatBranchLabel } from "../utils/branch";

const props = defineProps({
  assessment: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const loading = ref(false);
const submitting = ref(false);
const references = ref({ branches: [], positions: [] });
const allUsers = ref([]);
const userSearchQuery = ref("");

const selectedBranches = ref([]);
const selectedPositions = ref([]);
const selectedUsers = ref([]);
const { showToast } = useToast();
const theoryEnabled = ref(false);
const theoryData = ref(createEmptyTheory());
const theoryError = ref("");
const theoryLoading = ref(false);
const questionTypeOptions = [
  { value: "single", label: "Одиночный" },
  { value: "multiple", label: "Множественный" },
  { value: "text", label: "Эталонный ответ" },
  { value: "matching", label: "Сопоставление" },
];

const formData = ref({
  title: "",
  description: "",
  openAt: "",
  closeAt: "",
  timeLimitMinutes: 30,
  passScorePercent: 70,
  maxAttempts: 3,
  questions: [],
});

const filteredUsers = computed(() => {
  if (!userSearchQuery.value) return allUsers.value;
  const query = userSearchQuery.value.toLowerCase();
  return allUsers.value.filter((user) => user.first_name.toLowerCase().includes(query) || user.last_name.toLowerCase().includes(query));
});

// Определить статус аттестации и возможность редактирования параметров
const assessmentStatus = computed(() => {
  const now = new Date();
  const openAt = new Date(props.assessment.open_at);
  const closeAt = new Date(props.assessment.close_at);

  if (now < openAt) return "pending";
  if (now >= openAt && now <= closeAt) return "open";
  return "closed";
});

const canEditParameters = computed(() => {
  return assessmentStatus.value === "pending";
});

const validateTheory = (showMessage = false) => {
  if (!theoryEnabled.value) {
    theoryError.value = "";
    return true;
  }
  const result = validateTheoryData(theoryData.value);
  if (!result.valid) {
    theoryError.value = result.message;
    if (showMessage) {
      showToast(result.message, "warning");
    }
    return false;
  }
  theoryError.value = "";
  return true;
};

const persistTheoryVersion = async () => {
  if (!theoryEnabled.value || !hasTheoryBlocks(theoryData.value)) {
    return;
  }
  const payload = buildTheoryPayload(theoryData.value);
  await saveTheoryDraft(props.assessment.id, payload);
  await publishTheory(props.assessment.id, "new");
};

// Подсчёт пользователей, которые будут назначены
const assignedUsersPreview = computed(() => {
  const userIds = new Set();

  // Если выбраны и филиалы И должности - пересечение
  if (selectedBranches.value.length > 0 && selectedPositions.value.length > 0) {
    allUsers.value.forEach((user) => {
      if (selectedBranches.value.includes(user.branch_id) && selectedPositions.value.includes(user.position_id)) {
        userIds.add(user.id);
      }
    });
  } else {
    // Если только филиалы
    if (selectedBranches.value.length > 0) {
      allUsers.value.forEach((user) => {
        if (selectedBranches.value.includes(user.branch_id)) {
          userIds.add(user.id);
        }
      });
    }

    // Если только должности
    if (selectedPositions.value.length > 0) {
      allUsers.value.forEach((user) => {
        if (selectedPositions.value.includes(user.position_id)) {
          userIds.add(user.id);
        }
      });
    }
  }

  // Добавить напрямую выбранных пользователей
  selectedUsers.value.forEach((userId) => {
    userIds.add(userId);
  });

  return Array.from(userIds)
    .map((userId) => allUsers.value.find((u) => u.id === userId))
    .filter(Boolean);
});

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = data;
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadUsers = async () => {
  try {
    const data = await getUsers({});
    allUsers.value = data.users || [];
  } catch (error) {
    console.error("Load users error:", error);
  }
};

const loadTheory = async () => {
  theoryLoading.value = true;
  try {
    const response = await getAdminTheory(props.assessment.id);
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
  } finally {
    theoryLoading.value = false;
  }
};

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
    options: [
      { text: "", matchText: "", isCorrect: true },
      { text: "", matchText: "", isCorrect: false },
    ],
  });
};

const removeQuestion = (index) => {
  formData.value.questions.splice(index, 1);
};

const addOption = (questionIndex) => {
  const question = formData.value.questions[questionIndex];
  if (!question || question.questionType === "text") {
    return;
  }
  if (question.options.length >= 6) {
    return;
  }
  question.options.push({ text: "", matchText: "", isCorrect: false });
};

const removeOption = (questionIndex, optionIndex) => {
  const question = formData.value.questions[questionIndex];
  if (!question || question.questionType === "text") {
    return;
  }
  if (question.options.length > 2) {
    question.options.splice(optionIndex, 1);
  } else {
    showToast("Должно быть минимум 2 варианта ответа", "warning");
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
    question.options = [
      { text: "", matchText: "", isCorrect: true },
      { text: "", matchText: "", isCorrect: false },
    ];
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
    if (!hasCorrect && question.options.length > 0) {
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

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  if (typeof dateString === "string" && dateString.includes("T")) {
    return dateString.split("T")[0];
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
};

const handleSubmit = async () => {
  // Валидация
  if (!formData.value.title || !formData.value.openAt || !formData.value.closeAt) {
    showToast("Заполните все обязательные поля", "warning");
    return;
  }

  if (formData.value.questions.length === 0) {
    showToast("Добавьте хотя бы один вопрос", "warning");
    return;
  }

  // Проверка вопросов
  for (const question of formData.value.questions) {
    if (!question.text) {
      showToast("Все вопросы должны иметь текст", "warning");
      return;
    }
    if (question.questionType === "text") {
      if (!question.correctTextAnswer || !question.correctTextAnswer.trim()) {
        showToast("Для текстового вопроса необходимо указать эталонный ответ", "warning");
        return;
      }
      continue;
    }
    if (!question.options || question.options.length < 2) {
      showToast("У каждого вопроса должно быть минимум 2 варианта ответа", "warning");
      return;
    }
    if (question.questionType === "matching") {
      const allPairsFilled = question.options.every(
        (opt) => opt.text && opt.text.trim().length > 0 && opt.matchText && opt.matchText.trim().length > 0
      );
      if (!allPairsFilled) {
        showToast("Для сопоставления необходимо заполнить все пары", "warning");
        return;
      }
      continue;
    }
    const correctCount = question.options.filter((opt) => opt.isCorrect).length;
    if (question.questionType === "single" && correctCount !== 1) {
      showToast("У каждого вопроса должен быть ровно 1 правильный ответ", "warning");
      return;
    }
    if (question.questionType === "multiple" && correctCount < 2) {
      showToast("Для множественного выбора должно быть минимум 2 правильных ответа", "warning");
      return;
    }
  }

  if (!validateTheory(true)) {
    return;
  }

  submitting.value = true;

  try {
    const data = {
      title: formData.value.title,
      description: formData.value.description,
      openAt: formData.value.openAt + "T00:00:00",
      closeAt: formData.value.closeAt + "T23:59:59",
      questions: formData.value.questions.map((question) => ({
        text: question.text.trim(),
        questionType: question.questionType || "single",
        correctTextAnswer: question.questionType === "text" ? (question.correctTextAnswer || "").trim() : "",
        options:
          question.questionType === "text"
            ? []
            : (question.options || []).map((option) => ({
                text: option.text.trim(),
                matchText: option.matchText ? option.matchText.trim() : "",
                isCorrect: Boolean(option.isCorrect),
              })),
      })),
    };

    // Добавить параметры только если можно их редактировать
    if (canEditParameters.value) {
      data.timeLimitMinutes = Number(formData.value.timeLimitMinutes);
      data.passScorePercent = Number(formData.value.passScorePercent);
      data.maxAttempts = Number(formData.value.maxAttempts);
      data.branchIds = selectedBranches.value;
      data.positionIds = selectedPositions.value;
      data.userIds = selectedUsers.value;
    }

    await updateAssessment(props.assessment.id, data);

    if (theoryEnabled.value && hasTheoryBlocks(theoryData.value)) {
      try {
        await persistTheoryVersion();
      } catch (error) {
        console.error("Update theory error:", error);
        showToast("Не удалось сохранить теорию. Попробуйте позже.", "warning");
      }
    }

    showToast("Аттестация обновлена успешно!", "success");
    emit("submit");
  } catch (error) {
    console.error("Update assessment error:", error);
    showToast(error.response?.data?.error || "Ошибка обновления аттестации", "error");
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  loading.value = true;

  // Загрузить справочники и пользователей
  await Promise.all([loadReferences(), loadUsers()]);

  // Заполнить форму данными аттестации
  formData.value = {
    title: props.assessment.title,
    description: props.assessment.description || "",
    openAt: formatDateForInput(props.assessment.open_at),
    closeAt: formatDateForInput(props.assessment.close_at),
    timeLimitMinutes: props.assessment.time_limit_minutes,
    passScorePercent: props.assessment.pass_score_percent,
    maxAttempts: props.assessment.max_attempts,
    questions: props.assessment.questions.map((q) => ({
      text: q.question_text,
      questionType: q.question_type || q.questionType || (q.correct_text_answer || q.correctTextAnswer ? "text" : "single"),
      correctTextAnswer: q.correct_text_answer || q.correctTextAnswer || "",
      _typeCache: {
        text: { correctTextAnswer: q.correct_text_answer || q.correctTextAnswer || "" },
        single: { options: [] },
        multiple: { options: [] },
        matching: { options: [] },
      },
      options:
        (q.question_type || q.questionType) === "text" || q.correct_text_answer || q.correctTextAnswer
          ? []
          : (q.options || []).map((opt) => ({
              text: opt.option_text,
              matchText: opt.match_text || "",
              isCorrect: opt.is_correct === 1,
            })),
    })),
  };

  formData.value.questions.forEach((question) => {
    if (question.questionType === "text") {
      question._typeCache.text.correctTextAnswer = question.correctTextAnswer || "";
    } else {
      question._typeCache[question.questionType] = {
        options: (question.options || []).map((option) => ({
          text: option.text || "",
          matchText: option.matchText || "",
          isCorrect: Boolean(option.isCorrect),
        })),
      };
    }
  });

  // Загрузить текущие назначения из accessibility
  if (props.assessment.accessibility) {
    const { branches, positions, users } = props.assessment.accessibility;

    if (branches && branches.length > 0) {
      selectedBranches.value = branches.map((b) => b.id);
    }

    if (positions && positions.length > 0) {
      selectedPositions.value = positions.map((p) => p.id);
    }

    if (users && users.length > 0) {
      selectedUsers.value = users.map((u) => u.id);
    }
  }

  await loadTheory();
  loading.value = false;
});
</script>

<style scoped>
.assessment-edit-form {
  width: 100%;
}

.warning-banner {
  padding: 16px;
  margin-bottom: 24px;
  background: #fef3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
}

.warning-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #856404;
}

.warning-text {
  margin: 0;
  font-size: 14px;
  color: #856404;
  line-height: 1.5;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--divider);
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.question-card {
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
  font-weight: 600;
  color: var(--text-primary);
}

.question-type-toggle {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.type-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.option-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
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

.hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.assigned-preview {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--divider);
}

.preview-header {
  margin-bottom: 12px;
  color: var(--text-primary);
  font-size: 14px;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-user {
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-more {
  padding: 6px 8px;
  font-size: 13px;
  color: var(--text-hint);
  font-style: italic;
}

.theory-section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.section-hint {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.switch-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.switch-field input {
  width: 18px;
  height: 18px;
}

.theory-builder-wrapper {
  margin-top: 16px;
}

.inline-loading {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.error-text {
  color: #ef4444;
  margin-top: 12px;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
