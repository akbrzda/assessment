<template>
  <div class="course-topic-tests-step">
    <div v-if="!sections.length" class="tests-empty-state">
      <BookOpen :size="20" :stroke-width="1.8" />
      <div>
        <h3>Темы курса еще не добавлены</h3>
        <p>Сначала сформируйте структуру курса на предыдущем шаге, затем вернитесь к настройке тестов по темам.</p>
      </div>
    </div>

    <template v-else>
      <aside class="tests-sidebar">
        <div class="tests-sidebar-header">
          <div>
            <h3>Структура курса</h3>
            <p>Тест создается только для темы первого уровня.</p>
          </div>
        </div>

        <div class="tests-sections-list">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="tests-section-card"
            :class="{ 'tests-section-card-active': Number(section.id) === Number(selectedSectionId) }"
            @click="selectSection(section.id)"
          >
            <div class="tests-section-row">
              <div class="tests-section-row-left">
                <ChevronDown :size="16" :stroke-width="1.8" />
                <span class="tests-section-number">{{ section.orderIndex }}.</span>
                <span class="tests-section-title">{{ section.title }}</span>
              </div>
              <span class="tests-section-status" :class="`status-${getSectionStatus(section).tone}`">
                {{ getSectionStatus(section).label }}
              </span>
            </div>

            <div v-if="section.topics?.length" class="tests-topics-list">
              <div v-for="topic in section.topics" :key="topic.id" class="tests-topic-row">
                <span class="tests-topic-number">{{ section.orderIndex }}.{{ topic.orderIndex }}</span>
                <span class="tests-topic-title">{{ topic.title }}</span>
                <CircleCheckBig v-if="topic.hasMaterial" :size="15" :stroke-width="1.8" class="tests-topic-icon tests-topic-icon-ready" />
                <Circle v-else :size="15" :stroke-width="1.8" class="tests-topic-icon" />
              </div>
            </div>
          </button>
        </div>

        <div class="tests-sidebar-note">
          <Info :size="16" :stroke-width="1.8" />
          <p>Каждая тема может содержать подтемы с материалами, но тест привязывается к самой теме.</p>
        </div>
      </aside>

      <section v-if="activeSection && activeDraft" class="tests-main-card">
        <div class="tests-main-header">
          <div>
            <h2>Тест для темы</h2>
            <p>Создайте тест для проверки знаний по теме «{{ activeSection.title }}».</p>
          </div>

          <ActionButton action="create" label="Добавить вопрос" size="sm" @click="addQuestion" :disabled="activeDraft.loading" />
        </div>

        <div class="tests-layout">
          <div class="tests-content-card">
            <Tabs v-model="activeTab" :tabs="sectionTabsConfig" head-only class="mb-5" />

            <div v-if="activeDraft.loading" class="tests-loading-state">
              <LoaderCircle class="tests-spinning-icon" :size="18" :stroke-width="1.8" />
              <span>Загрузка теста темы...</span>
            </div>

            <template v-else-if="activeTab === 'questions'">
              <div v-if="!activeDraft.questions.length" class="tests-empty-questions">
                <ClipboardList :size="18" :stroke-width="1.8" />
                <p>Вопросов пока нет. Добавьте хотя бы один вопрос для создания теста.</p>
              </div>

              <div v-else class="tests-questions-list">
                <article v-for="(question, questionIndex) in activeDraft.questions" :key="question.localId" class="tests-question-card">
                  <div class="tests-question-header">
                    <div>
                      <span class="tests-question-label">Вопрос {{ questionIndex + 1 }}</span>
                      <p class="tests-question-hint">Настройте текст, тип ответа и правильные значения.</p>
                    </div>
                    <Button type="button" class="tests-question-remove" variant="danger" size="sm" icon="trash" :icon-only="true" aria-label="Удалить вопрос" @click="removeQuestion(questionIndex)" />
                  </div>

                  <Textarea
                    :model-value="question.text"
                    label="Текст вопроса"
                    placeholder="Введите формулировку вопроса"
                    :rows="3"
                    @update:modelValue="updateQuestionText(questionIndex, $event)"
                  />

                  <div class="tests-type-grid">
                    <button
                      v-for="typeOption in questionTypeOptions"
                      :key="typeOption.value"
                      type="button"
                      class="tests-type-pill"
                      :class="{ 'tests-type-pill-active': question.questionType === typeOption.value }"
                      @click="setQuestionType(questionIndex, typeOption.value)"
                    >
                      {{ typeOption.label }}
                    </button>
                  </div>

                  <p class="tests-inline-hint">{{ getQuestionTypeHint(question.questionType) }}</p>

                  <div v-if="question.questionType === 'text'" class="tests-text-answer-block">
                    <Textarea
                      :model-value="question.correctTextAnswer"
                      label="Эталонный ответ"
                      placeholder="Введите текст правильного ответа"
                      :rows="2"
                      @update:modelValue="updateCorrectTextAnswer(questionIndex, $event)"
                    />
                  </div>

                  <div v-else class="tests-options-block">
                    <div class="tests-options-header">
                      <span>Варианты ответов</span>
                      <Button type="button" class="tests-inline-action" variant="ghost" size="sm" icon="plus" :disabled="question.options.length >= 6" @click="addOption(questionIndex)">
                        Вариант
                      </Button>
                    </div>

                    <div class="tests-options-list">
                      <div v-for="(option, optionIndex) in question.options" :key="option.localId" class="tests-option-row">
                        <template v-if="question.questionType === 'matching'">
                          <Input
                            :model-value="option.text"
                            placeholder="Левая колонка"
                            @update:modelValue="updateOptionField(questionIndex, optionIndex, 'text', $event)"
                          />
                          <Input
                            :model-value="option.matchText"
                            placeholder="Правая колонка"
                            @update:modelValue="updateOptionField(questionIndex, optionIndex, 'matchText', $event)"
                          />
                        </template>

                        <template v-else>
                          <Input
                            :model-value="option.text"
                            placeholder="Текст варианта"
                            @update:modelValue="updateOptionField(questionIndex, optionIndex, 'text', $event)"
                          />

                          <label class="tests-correct-flag">
                            <input
                              v-if="question.questionType === 'multiple'"
                              :checked="option.isCorrect"
                              type="checkbox"
                              @change="toggleCorrectOption(questionIndex, optionIndex, $event.target.checked)"
                            />
                            <input
                              v-else
                              :checked="option.isCorrect"
                              type="radio"
                              :name="`question-${question.localId}`"
                              @change="setCorrectOption(questionIndex, optionIndex)"
                            />
                            <span>Правильный</span>
                          </label>
                        </template>

                        <Button
                          type="button"
                          class="tests-option-remove"
                          variant="danger"
                          size="sm"
                          icon="x"
                          :icon-only="true"
                          aria-label="Удалить вариант ответа"
                          :disabled="question.options.length <= 2"
                          @click="removeOption(questionIndex, optionIndex)"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </template>

            <template v-else>
              <div class="tests-settings-section">
                <h3>Параметры теста</h3>

                <div class="tests-settings-grid">
                  <div class="tests-field-with-suffix">
                    <Input
                      :model-value="activeDraft.timeLimitMinutes"
                      label="Время на прохождение"
                      type="number"
                      min="1"
                      @update:modelValue="updateNumericField('timeLimitMinutes', $event)"
                    />
                    <span class="tests-field-suffix">мин</span>
                  </div>

                  <div class="tests-field-with-suffix">
                    <Input
                      :model-value="activeDraft.passScorePercent"
                      label="Порог прохождения"
                      type="number"
                      min="0"
                      max="100"
                      @update:modelValue="updateNumericField('passScorePercent', $event)"
                    />
                    <span class="tests-field-suffix">%</span>
                  </div>
                </div>
              </div>

              <div class="tests-settings-section">
                <h3>Дополнительные настройки</h3>

                <label class="tests-toggle-row">
                  <div>
                    <strong>Перемешивать вопросы</strong>
                    <p>Порядок вопросов будет случайным для каждого пользователя.</p>
                  </div>
                  <input
                    :checked="activeDraft.shuffleQuestions"
                    type="checkbox"
                    @change="updateBooleanField('shuffleQuestions', $event.target.checked)"
                  />
                </label>

                <label class="tests-toggle-row">
                  <div>
                    <strong>Перемешивать варианты ответов</strong>
                    <p>Порядок вариантов ответов будет случайным.</p>
                  </div>
                  <input
                    :checked="activeDraft.shuffleOptions"
                    type="checkbox"
                    @change="updateBooleanField('shuffleOptions', $event.target.checked)"
                  />
                </label>

                <label class="tests-toggle-row">
                  <div>
                    <strong>Показывать результаты после завершения</strong>
                    <p>Пользователь увидит результат и правильные ответы после прохождения.</p>
                  </div>
                  <input
                    :checked="activeDraft.showResultsAfterCompletion"
                    type="checkbox"
                    @change="updateBooleanField('showResultsAfterCompletion', $event.target.checked)"
                  />
                </label>

                <div class="tests-attempts-row" :class="{ 'tests-attempts-row-disabled': !activeDraft.limitAttempts }">
                  <label class="tests-toggle-row tests-toggle-row-inline">
                    <div>
                      <strong>Ограничить количество попыток</strong>
                      <p>Пользователь сможет пройти тест только указанное количество раз.</p>
                    </div>
                    <input :checked="activeDraft.limitAttempts" type="checkbox" @change="toggleAttemptsLimit($event.target.checked)" />
                  </label>

                  <Input
                    :model-value="activeDraft.maxAttempts"
                    label="Количество попыток"
                    type="number"
                    min="1"
                    :disabled="!activeDraft.limitAttempts"
                    @update:modelValue="updateNumericField('maxAttempts', $event)"
                  />
                </div>
              </div>
            </template>
          </div>

          <aside class="tests-summary-card">
            <div class="tests-summary-block">
              <h4>Информация о теме</h4>
              <div class="tests-summary-row">
                <span>Тема</span>
                <strong>{{ activeSection.orderIndex }}. {{ activeSection.title }}</strong>
              </div>
              <div class="tests-summary-row">
                <span>Подтемы</span>
                <strong>{{ activeSection.topics?.length || 0 }}</strong>
              </div>
              <div class="tests-summary-row">
                <span>Материалы</span>
                <strong>{{ getMaterialsCount(activeSection) }}</strong>
              </div>
              <div class="tests-summary-row">
                <span>Тест</span>
                <strong class="tests-summary-badge" :class="`badge-${getSectionStatus(activeSection).tone}`">
                  {{ getSectionStatus(activeSection).label }}
                </strong>
              </div>
            </div>

            <div class="tests-summary-note">
              <Info :size="16" :stroke-width="1.8" />
              <div>
                <h4>О тесте для темы</h4>
                <p>Тест оценивает знания по всей теме и ее материалам. Сначала пользователь изучает подтемы, затем проходит тест.</p>
              </div>
            </div>

            <div v-if="activeDraft.dirty" class="tests-pending-state">
              <Clock3 :size="16" :stroke-width="1.8" />
              <span>Есть несохраненные изменения. Они сохранятся при переходе дальше.</span>
            </div>
          </aside>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { BookOpen, ChevronDown, Circle, CircleCheckBig, ClipboardList, Clock3, Info, LoaderCircle } from "lucide-vue-next";
import { getAssessmentById, createAssessment, updateAssessment } from "@/api/assessments";
import { updateCourseSection } from "@/api/courses";
import { useToast } from "@/composables/useToast";
import { Input, Textarea, Tabs, Button } from "@/components/ui";
import ActionButton from "@/components/ui/ActionButton.vue";

const props = defineProps({
  course: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["course-updated"]);

const { showToast } = useToast();

const selectedSectionId = ref(null);
const activeTab = ref("questions");

const sectionTabsConfig = [
  { value: "questions", label: "Вопросы" },
  { value: "settings", label: "Настройки теста" },
];
const drafts = ref({});
const tempIdCounter = ref(0);

const questionTypeOptions = [
  { value: "single", label: "Один ответ" },
  { value: "multiple", label: "Несколько ответов" },
  { value: "matching", label: "Сопоставление" },
  { value: "text", label: "Текстовый ответ" },
];

const sections = computed(() => props.course?.sections || []);
const activeSection = computed(
  () => sections.value.find((section) => Number(section.id) === Number(selectedSectionId.value)) || sections.value[0] || null,
);
const activeDraft = computed(() => {
  if (!activeSection.value) {
    return null;
  }
  return drafts.value[activeSection.value.id] || null;
});

const getNextTempId = () => {
  tempIdCounter.value += 1;
  return `tmp-${tempIdCounter.value}`;
};

const createDefaultOptions = (questionType = "single") => {
  if (questionType === "matching") {
    return [
      { localId: getNextTempId(), text: "", matchText: "", isCorrect: false },
      { localId: getNextTempId(), text: "", matchText: "", isCorrect: false },
    ];
  }
  return [
    { localId: getNextTempId(), text: "", matchText: "", isCorrect: true },
    { localId: getNextTempId(), text: "", matchText: "", isCorrect: false },
  ];
};

const createEmptyQuestion = () => ({
  localId: getNextTempId(),
  text: "",
  questionType: "single",
  correctTextAnswer: "",
  options: createDefaultOptions(),
});

const serializeDraft = (draft) =>
  JSON.stringify({
    assessmentId: draft.assessmentId || null,
    timeLimitMinutes: Number(draft.timeLimitMinutes || 0),
    passScorePercent: Number(draft.passScorePercent || 0),
    limitAttempts: Boolean(draft.limitAttempts),
    maxAttempts: Number(draft.maxAttempts || 0),
    shuffleQuestions: Boolean(draft.shuffleQuestions),
    shuffleOptions: Boolean(draft.shuffleOptions),
    showResultsAfterCompletion: Boolean(draft.showResultsAfterCompletion),
    questions: (draft.questions || []).map((question) => ({
      text: question.text,
      questionType: question.questionType,
      correctTextAnswer: question.correctTextAnswer,
      options: (question.options || []).map((option) => ({
        text: option.text,
        matchText: option.matchText,
        isCorrect: Boolean(option.isCorrect),
      })),
    })),
  });

const createDraftFromSection = (section) => {
  const draft = {
    assessmentId: section.assessmentId || null,
    loaded: !section.assessmentId,
    loading: false,
    applying: false,
    dirty: false,
    timeLimitMinutes: 15,
    passScorePercent: 70,
    limitAttempts: true,
    maxAttempts: 1,
    shuffleQuestions: section.testShuffleQuestions ?? true,
    shuffleOptions: section.testShuffleOptions ?? true,
    showResultsAfterCompletion: section.testShowResultsAfterCompletion ?? true,
    questions: [],
    snapshot: "",
  };
  draft.snapshot = serializeDraft(draft);
  return draft;
};

const applySectionStateToDraft = (section, existingDraft = null) => {
  const draft = existingDraft || createDraftFromSection(section);
  draft.applying = true;
  draft.assessmentId = section.assessmentId || null;
  draft.shuffleQuestions = section.testShuffleQuestions ?? draft.shuffleQuestions ?? true;
  draft.shuffleOptions = section.testShuffleOptions ?? draft.shuffleOptions ?? true;
  draft.showResultsAfterCompletion = section.testShowResultsAfterCompletion ?? draft.showResultsAfterCompletion ?? true;
  if (!section.assessmentId && !draft.questions.length) {
    draft.loaded = true;
  }
  draft.snapshot = serializeDraft(draft);
  draft.dirty = false;
  draft.applying = false;
  return draft;
};

const mapAssessmentQuestion = (question) => {
  const questionType = question.question_type || question.questionType || "single";
  return {
    localId: question.id || getNextTempId(),
    text: question.question_text || question.text || "",
    questionType,
    correctTextAnswer: question.correct_text_answer || question.correctTextAnswer || "",
    options:
      questionType === "text"
        ? []
        : (question.options || []).map((option) => ({
            localId: option.id || getNextTempId(),
            text: option.option_text || option.text || "",
            matchText: option.match_text || option.matchText || "",
            isCorrect: option.is_correct === 1 || option.isCorrect === true,
          })),
  };
};

const applyAssessmentToDraft = (draft, assessment) => {
  draft.applying = true;
  draft.assessmentId = assessment.id;
  draft.timeLimitMinutes = Number(assessment.time_limit_minutes ?? assessment.timeLimitMinutes ?? 15);
  draft.passScorePercent = Number(assessment.pass_score_percent ?? assessment.passScorePercent ?? 70);
  const maxAttempts = Number(assessment.max_attempts ?? assessment.maxAttempts ?? 0);
  draft.limitAttempts = maxAttempts > 0;
  draft.maxAttempts = maxAttempts > 0 ? maxAttempts : 1;
  draft.questions = Array.isArray(assessment.questions) ? assessment.questions.map((question) => mapAssessmentQuestion(question)) : [];
  draft.loaded = true;
  draft.snapshot = serializeDraft(draft);
  draft.dirty = false;
  draft.applying = false;
};

watch(
  sections,
  (nextSections) => {
    const nextDrafts = { ...drafts.value };
    const validIds = new Set(nextSections.map((section) => Number(section.id)));

    nextSections.forEach((section) => {
      const currentDraft = nextDrafts[section.id];
      if (!currentDraft) {
        nextDrafts[section.id] = createDraftFromSection(section);
        return;
      }
      if (!currentDraft.dirty) {
        nextDrafts[section.id] = applySectionStateToDraft(section, currentDraft);
      }
    });

    Object.keys(nextDrafts).forEach((key) => {
      if (!validIds.has(Number(key))) {
        delete nextDrafts[key];
      }
    });

    drafts.value = nextDrafts;

    if (!nextSections.length) {
      selectedSectionId.value = null;
      return;
    }

    if (!validIds.has(Number(selectedSectionId.value))) {
      selectedSectionId.value = nextSections[0].id;
    }
  },
  { immediate: true },
);

watch(
  drafts,
  () => {
    Object.values(drafts.value).forEach((draft) => {
      if (draft?.applying || draft?.loading) {
        return;
      }
      draft.dirty = serializeDraft(draft) !== draft.snapshot;
    });
  },
  { deep: true },
);

watch(
  activeSection,
  async (section) => {
    if (section) {
      await ensureDraftLoaded(section.id);
    }
  },
  { immediate: true },
);

const ensureDraftLoaded = async (sectionId) => {
  const section = sections.value.find((item) => Number(item.id) === Number(sectionId));
  const draft = drafts.value[sectionId];
  if (!section || !draft || !section.assessmentId || draft.loading || draft.loaded) {
    return;
  }

  draft.loading = true;
  try {
    const response = await getAssessmentById(section.assessmentId);
    applyAssessmentToDraft(draft, response.assessment || {});
  } catch (error) {
    showToast(error?.response?.data?.error || "Не удалось загрузить тест темы", "error");
  } finally {
    draft.loading = false;
  }
};

const selectSection = async (sectionId) => {
  selectedSectionId.value = sectionId;
  await ensureDraftLoaded(sectionId);
};

const getMaterialsCount = (section) => (section.topics || []).filter((topic) => topic.hasMaterial).length;

const getSectionStatus = (section) => {
  const draft = drafts.value[section.id];
  if (draft?.assessmentId) {
    return { label: "Создан", tone: "success" };
  }
  if (draft?.questions?.length) {
    return { label: "Будет создан", tone: "pending" };
  }
  return { label: "Не создан", tone: "muted" };
};

const getQuestionTypeHint = (questionType) => {
  if (questionType === "single") return "Выберите один правильный вариант ответа.";
  if (questionType === "multiple") return "Отметьте несколько правильных вариантов ответа.";
  if (questionType === "matching") return "Заполните пары значений для сопоставления.";
  return "Пользователь вводит текст, который сверяется с эталонным ответом.";
};

const updateNumericField = (field, value) => {
  if (!activeDraft.value) return;
  if (value === "" || value === null || value === undefined) {
    activeDraft.value[field] = "";
    return;
  }
  const parsed = Number(value);
  activeDraft.value[field] = Number.isFinite(parsed) ? parsed : activeDraft.value[field];
};

const updateBooleanField = (field, checked) => {
  if (!activeDraft.value) return;
  activeDraft.value[field] = Boolean(checked);
};

const toggleAttemptsLimit = (checked) => {
  if (!activeDraft.value) return;
  activeDraft.value.limitAttempts = Boolean(checked);
  if (checked && (!activeDraft.value.maxAttempts || Number(activeDraft.value.maxAttempts) < 1)) {
    activeDraft.value.maxAttempts = 1;
  }
};

const addQuestion = () => {
  if (!activeDraft.value) return;
  activeTab.value = "questions";
  activeDraft.value.questions.push(createEmptyQuestion());
};

const removeQuestion = (questionIndex) => {
  if (!activeDraft.value) return;
  activeDraft.value.questions.splice(questionIndex, 1);
};

const updateQuestionText = (questionIndex, value) => {
  if (!activeDraft.value?.questions?.[questionIndex]) return;
  activeDraft.value.questions[questionIndex].text = value;
};

const updateCorrectTextAnswer = (questionIndex, value) => {
  if (!activeDraft.value?.questions?.[questionIndex]) return;
  activeDraft.value.questions[questionIndex].correctTextAnswer = value;
};

const normalizeOptionsForType = (questionType) => {
  if (questionType === "matching") {
    return createDefaultOptions("matching");
  }
  return createDefaultOptions();
};

const setQuestionType = (questionIndex, questionType) => {
  const question = activeDraft.value?.questions?.[questionIndex];
  if (!question || question.questionType === questionType) return;

  question.questionType = questionType;
  if (questionType === "text") {
    question.options = [];
    question.correctTextAnswer = question.correctTextAnswer || "";
    return;
  }

  question.correctTextAnswer = "";
  question.options = normalizeOptionsForType(questionType);
};

const addOption = (questionIndex) => {
  const question = activeDraft.value?.questions?.[questionIndex];
  if (!question || question.questionType === "text" || question.options.length >= 6) return;
  question.options.push({
    localId: getNextTempId(),
    text: "",
    matchText: "",
    isCorrect: false,
  });
};

const removeOption = (questionIndex, optionIndex) => {
  const question = activeDraft.value?.questions?.[questionIndex];
  if (!question || question.questionType === "text" || question.options.length <= 2) return;
  question.options.splice(optionIndex, 1);
  if (question.questionType === "single" && !question.options.some((option) => option.isCorrect)) {
    question.options[0].isCorrect = true;
  }
};

const updateOptionField = (questionIndex, optionIndex, field, value) => {
  const option = activeDraft.value?.questions?.[questionIndex]?.options?.[optionIndex];
  if (!option) return;
  option[field] = value;
};

const setCorrectOption = (questionIndex, optionIndex) => {
  const question = activeDraft.value?.questions?.[questionIndex];
  if (!question) return;
  question.options.forEach((option, index) => {
    option.isCorrect = index === optionIndex;
  });
};

const toggleCorrectOption = (questionIndex, optionIndex, checked) => {
  const option = activeDraft.value?.questions?.[questionIndex]?.options?.[optionIndex];
  if (!option) return;
  option.isCorrect = Boolean(checked);
};

const validateDraft = (draft) => {
  if (Number(draft.timeLimitMinutes || 0) < 1) {
    showToast("Укажите корректное время прохождения теста", "error");
    activeTab.value = "settings";
    return false;
  }
  if (Number(draft.passScorePercent || 0) < 0 || Number(draft.passScorePercent || 0) > 100) {
    showToast("Порог прохождения должен быть в диапазоне от 0 до 100", "error");
    activeTab.value = "settings";
    return false;
  }
  if (draft.limitAttempts && Number(draft.maxAttempts || 0) < 1) {
    showToast("Количество попыток должно быть не меньше 1", "error");
    activeTab.value = "settings";
    return false;
  }
  if (!draft.questions.length) {
    return true;
  }

  const valid = draft.questions.every((question) => {
    if (!String(question.text || "").trim()) return false;
    if (question.questionType === "text") {
      return Boolean(String(question.correctTextAnswer || "").trim());
    }
    if (!Array.isArray(question.options) || question.options.length < 2) return false;
    if (
      !question.options.every((option) =>
        question.questionType === "matching"
          ? String(option.text || "").trim() && String(option.matchText || "").trim()
          : String(option.text || "").trim(),
      )
    ) {
      return false;
    }
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (question.questionType === "single") return correctCount === 1;
    if (question.questionType === "multiple") return correctCount >= 2;
    return true;
  });

  if (!valid) {
    showToast("Проверьте вопросы и варианты ответов теста", "error");
    activeTab.value = "questions";
    return false;
  }

  return true;
};

const buildAssessmentPayload = (section, draft) => {
  const openAt = new Date();
  openAt.setDate(openAt.getDate() - 1);
  const closeAt = new Date();
  closeAt.setFullYear(closeAt.getFullYear() + 50);

  return {
    title: `Тест по теме: ${section.title}`,
    description: `Внутренний тест темы курса \"${props.course?.title || "Курс"}\"`,
    openAt: openAt.toISOString(),
    closeAt: closeAt.toISOString(),
    timeLimitMinutes: Number(draft.timeLimitMinutes || 15),
    passScorePercent: Number(draft.passScorePercent || 70),
    maxAttempts: draft.limitAttempts ? Number(draft.maxAttempts || 1) : 0,
    branchIds: [],
    userIds: [],
    positionIds: [],
    internalCourseSectionId: Number(section.id),
    questions: draft.questions.map((question) => ({
      text: String(question.text || "").trim(),
      questionType: question.questionType,
      correctTextAnswer: question.questionType === "text" ? String(question.correctTextAnswer || "").trim() : "",
      options:
        question.questionType === "text"
          ? []
          : question.options.map((option) => ({
              text: String(option.text || "").trim(),
              matchText: option.matchText ? String(option.matchText).trim() : "",
              isCorrect: Boolean(option.isCorrect),
            })),
    })),
  };
};

const buildSectionPayload = (draft) => ({
  assessmentId: draft.assessmentId || null,
  testShuffleQuestions: Boolean(draft.shuffleQuestions),
  testShuffleOptions: Boolean(draft.shuffleOptions),
  testShowResultsAfterCompletion: Boolean(draft.showResultsAfterCompletion),
});

const saveSectionDraft = async (sectionId) => {
  const section = sections.value.find((item) => Number(item.id) === Number(sectionId));
  const draft = drafts.value[sectionId];
  if (!section || !draft || !draft.dirty) {
    return true;
  }

  if (!validateDraft(draft)) {
    return false;
  }

  draft.loading = true;
  try {
    let nextAssessmentId = draft.assessmentId || null;

    if (draft.questions.length) {
      const assessmentPayload = buildAssessmentPayload(section, draft);
      if (nextAssessmentId) {
        await updateAssessment(nextAssessmentId, assessmentPayload);
      } else {
        const response = await createAssessment(assessmentPayload);
        nextAssessmentId = Number(response?.assessment?.id || response?.assessmentId || 0) || null;
        if (!nextAssessmentId) {
          throw new Error("Не удалось получить идентификатор теста темы");
        }
      }
    }

    draft.assessmentId = nextAssessmentId;
    const response = await updateCourseSection(section.id, {
      ...buildSectionPayload(draft),
      assessmentId: nextAssessmentId,
    });

    if (response?.course) {
      emit("course-updated", response.course);
    }

    draft.applying = true;
    draft.snapshot = serializeDraft(draft);
    draft.dirty = false;
    draft.applying = false;
    return true;
  } catch (error) {
    showToast(error?.response?.data?.error || error?.message || "Не удалось сохранить тест темы", "error");
    return false;
  } finally {
    draft.loading = false;
  }
};

const savePendingChanges = async () => {
  const dirtySections = sections.value.filter((section) => drafts.value[section.id]?.dirty);
  for (const section of dirtySections) {
    const saved = await saveSectionDraft(section.id);
    if (!saved) {
      selectedSectionId.value = section.id;
      return false;
    }
  }
  return true;
};

defineExpose({
  savePendingChanges,
});
</script>

<style scoped>
.course-topic-tests-step {
  display: grid;
  grid-template-columns: 318px minmax(0, 1fr);
  gap: 16px;
  min-height: 680px;
}

.tests-empty-state {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 24px;
  border: 1px solid #e6e8f2;
  border-radius: 24px;
  background: #ffffff;
  color: #4e5470;
}

.tests-empty-state h3,
.tests-empty-state p,
.tests-sidebar-header h3,
.tests-main-header h2,
.tests-summary-block h4,
.tests-summary-note h4,
.tests-settings-section h3 {
  margin: 0;
}

.tests-empty-state p,
.tests-sidebar-header p,
.tests-main-header p,
.tests-summary-note p,
.tests-question-hint,
.tests-inline-hint,
.tests-toggle-row p {
  margin: 0;
  color: #7f85a2;
}

.tests-sidebar,
.tests-main-card,
.tests-content-card,
.tests-summary-card {
  border: 1px solid #e9ebf5;
  border-radius: 20px;
  background: #ffffff;
}

.tests-sidebar {
  padding: 16px;
}

.tests-sidebar-header {
  padding: 2px 4px 14px;
}

.tests-sidebar-header h3 {
  font-size: 18px;
  line-height: 1.2;
  color: #1f2540;
}

.tests-sidebar-header p {
  margin-top: 6px;
  font-size: 13px;
}

.tests-sections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tests-section-card {
  width: 100%;
  border: 1px solid #ebeefa;
  border-radius: 16px;
  background: #ffffff;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.tests-section-card:hover,
.tests-section-card-active {
  border-color: #d6d2ff;
  background: #f8f6ff;
  box-shadow: 0 10px 24px rgba(102, 92, 255, 0.08);
}

.tests-section-row,
.tests-topic-row,
.tests-summary-row,
.tests-option-row {
  display: flex;
  align-items: center;
}

.tests-section-row {
  justify-content: space-between;
  gap: 10px;
}

.tests-section-row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tests-section-number,
.tests-topic-number {
  font-size: 13px;
  font-weight: 600;
  color: #6c7293;
}

.tests-section-title,
.tests-topic-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tests-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #232947;
}

.tests-topics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-left: 25px;
}

.tests-topic-row {
  gap: 8px;
  color: #66708f;
}

.tests-topic-title {
  flex: 1;
  font-size: 13px;
}

.tests-topic-icon {
  color: #c1c7de;
}

.tests-topic-icon-ready {
  color: #57b97d;
}

.tests-section-status,
.tests-summary-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.status-success,
.badge-success {
  background: #ecfbf1;
  color: #3d9c64;
}

.status-pending,
.badge-pending {
  background: #f3efff;
  color: #655cff;
}

.status-muted,
.badge-muted {
  background: #f1f3f8;
  color: #7f85a2;
}

.tests-sidebar-note,
.tests-summary-note,
.tests-pending-state {
  display: flex;
  gap: 10px;
  border-radius: 16px;
  padding: 14px;
}

.tests-sidebar-note {
  margin-top: 14px;
  background: #f8f6ff;
  color: #6258f4;
}

.tests-sidebar-note p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.tests-main-card {
  padding: 16px;
}

.tests-main-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 4px 18px;
}

.tests-main-header h2 {
  font-size: 30px;
  line-height: 1.05;
  color: #1f2540;
}

.tests-main-header p {
  margin-top: 8px;
  font-size: 14px;
}

.tests-add-question-button,
.tests-inline-action,
.tests-question-remove,
.tests-option-remove,
.tests-type-pill {
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tests-add-question-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #655cff;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.tests-add-question-button:disabled,
.tests-inline-action:disabled,
.tests-option-remove:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tests-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 284px;
  gap: 16px;
}

.tests-content-card,
.tests-summary-card {
  padding: 18px;
}

.tests-loading-state,
.tests-empty-questions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 240px;
  border: 1px dashed #d9dced;
  border-radius: 16px;
  color: #7f85a2;
  text-align: center;
  padding: 20px;
}

.tests-spinning-icon {
  animation: tests-spin 1s linear infinite;
}

@keyframes tests-spin {
  to {
    transform: rotate(360deg);
  }
}

.tests-questions-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tests-question-card {
  border: 1px solid #eceef7;
  border-radius: 18px;
  padding: 18px;
  background: #fcfcff;
}

.tests-question-header,
.tests-options-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tests-question-label {
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  color: #1f2540;
}

.tests-question-hint {
  margin-top: 4px;
  font-size: 13px;
}

.tests-question-remove,
.tests-option-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #fff3f3;
  color: #d94d5e;
}

.tests-type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tests-type-pill {
  padding: 9px 12px;
  border-radius: 999px;
  background: #f4f5fb;
  color: #636b88;
  font-size: 13px;
  font-weight: 600;
}

.tests-type-pill-active {
  background: #efecff;
  color: #655cff;
}

.tests-inline-hint {
  margin-top: 10px;
  font-size: 13px;
}

.tests-text-answer-block,
.tests-options-block,
.tests-settings-section {
  margin-top: 18px;
}

.tests-options-header {
  margin-bottom: 12px;
}

.tests-options-header span,
.tests-settings-section h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1f2540;
}

.tests-inline-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f4f5fb;
  color: #5a627f;
  font-size: 12px;
  font-weight: 700;
}

.tests-options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tests-option-row {
  gap: 10px;
  align-items: flex-start;
}

.tests-option-row > *:first-child {
  flex: 1;
}

.tests-correct-flag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 10px;
  border: 1px solid #eceef7;
  border-radius: 12px;
  color: #4e5470;
  white-space: nowrap;
}

.tests-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.tests-field-with-suffix {
  position: relative;
}

.tests-field-suffix {
  position: absolute;
  right: 16px;
  bottom: 14px;
  font-size: 13px;
  font-weight: 700;
  color: #9197b2;
}

.tests-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f2f8;
}

.tests-toggle-row strong {
  display: block;
  margin-bottom: 6px;
  color: #1f2540;
  font-size: 14px;
}

.tests-toggle-row input[type="checkbox"] {
  width: 42px;
  height: 24px;
  accent-color: #655cff;
}

.tests-attempts-row {
  margin-top: 8px;
}

.tests-attempts-row-disabled {
  opacity: 0.7;
}

.tests-summary-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: start;
}

.tests-summary-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tests-summary-block h4,
.tests-summary-note h4 {
  font-size: 15px;
  font-weight: 700;
  color: #1f2540;
}

.tests-summary-row {
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: #727998;
}

.tests-summary-row strong {
  color: #1f2540;
  text-align: right;
}

.tests-summary-note {
  background: #f8f6ff;
  color: #655cff;
}

.tests-summary-note p {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.tests-pending-state {
  background: #fff8ea;
  color: #b77b0d;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 1100px) {
  .course-topic-tests-step,
  .tests-layout {
    grid-template-columns: 1fr;
  }

  .tests-summary-card {
    order: -1;
  }
}

@media (max-width: 720px) {
  .tests-main-header,
  .tests-options-header,
  .tests-question-header,
  .tests-toggle-row,
  .tests-section-row {
    flex-direction: column;
    align-items: stretch;
  }

  .tests-settings-grid {
    grid-template-columns: 1fr;
  }

  .tests-option-row {
    flex-direction: column;
  }

  .tests-add-question-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
