<template>
  <div class="course-final-assessment-step">
    <section class="final-main-panel">
      <div class="final-heading">
        <h2>Аттестация курса</h2>
        <p>Настройте итоговую аттестацию, по которой будет оцениваться прохождение всего курса.</p>
      </div>

      <div class="final-grid">
        <div class="final-left-card">
          <section class="final-section">
            <h3>Основные настройки</h3>

            <div class="final-form-grid">
              <label class="final-field">
                <span>Название аттестации <b>*</b></span>
                <input v-model.trim="draft.title" maxlength="150" type="text" />
                <small>{{ draft.title.length }}/150</small>
              </label>

              <label class="final-field">
                <span>Описание (необязательно)</span>
                <textarea v-model.trim="draft.description" maxlength="300" placeholder="Краткое описание итоговой аттестации для слушателей..." />
                <small>{{ draft.description.length }}/300</small>
              </label>

              <label class="final-field">
                <span>Тип аттестации</span>
                <select v-model="draft.assessmentType">
                  <option value="testing">Тестирование</option>
                </select>
              </label>

              <label class="final-field">
                <span>Количество попыток</span>
                <input v-model.number="draft.maxAttempts" min="1" type="number" />
              </label>
            </div>
          </section>

          <section class="final-section final-params-section">
            <h3>Параметры аттестации</h3>

            <div class="final-form-grid final-form-grid-compact">
              <label class="final-field">
                <span>Время на прохождение (минуты) <b>*</b></span>
                <input v-model.number="draft.timeLimitMinutes" min="1" type="number" />
                <em>Рекомендуемое время: 60-120 минут</em>
              </label>

              <label class="final-field">
                <span>Порог прохождения (%) <b>*</b></span>
                <input v-model.number="draft.passScorePercent" min="0" max="100" type="number" />
                <em>Минимальный процент для успешного прохождения</em>
              </label>
            </div>

            <div class="final-help-box">
              <Info :size="16" :stroke-width="2" />
              <div>
                <strong>Как это работает</strong>
                <p>Слушатель должен набрать указанное количество процентов в итоговой аттестации в пределах отведенного времени.</p>
                <p>При неуспешной попытке слушатель сможет пройти аттестацию повторно в пределах доступных попыток.</p>
              </div>
            </div>
          </section>

          <section class="final-section">
            <h3>Содержание аттестации</h3>
            <p class="final-section-caption">Выберите, что будет включено в итоговую аттестацию курса.</p>

            <label class="final-radio-row">
              <input v-model="draft.scope" type="radio" value="all" />
              <span>
                <strong>Весь курс (все темы)</strong>
                <small>В итоговую аттестацию будут включены вопросы по всем темам курса.</small>
              </span>
            </label>

            <label class="final-radio-row">
              <input v-model="draft.scope" type="radio" value="selected" />
              <span>
                <strong>Выбранные темы</strong>
                <small>Выберите конкретные темы, по которым будут вопросы в аттестации.</small>
              </span>
            </label>

            <div v-if="draft.scope === 'selected'" class="final-selected-list">
              <label v-for="section in sections" :key="section.id" class="final-checkbox-row">
                <input :checked="isSectionSelected(section.id)" type="checkbox" @change="toggleSection(section.id, $event.target.checked)" />
                <span>{{ section.orderIndex }}. {{ section.title }}</span>
              </label>
            </div>
          </section>
        </div>

        <aside class="final-structure-card">
          <h3>Структура аттестации</h3>
          <p>Всего вопросов: {{ totalSelectedQuestions }}</p>

          <div class="final-topic-list">
            <div v-for="section in includedSections" :key="section.id" class="final-topic-item">
              <ChevronRight :size="14" :stroke-width="2" />
              <strong>{{ section.orderIndex }}. {{ section.title }}</strong>
              <label>
                <input
                  :value="getSectionLimit(section.id)"
                  min="0"
                  type="number"
                  @input="setSectionLimit(section.id, $event.target.value)"
                />
                <span>вопросов</span>
              </label>
              <ChevronDown :size="14" :stroke-width="2" />
            </div>
          </div>

          <div class="final-note">
            <Info :size="16" :stroke-width="2" />
            <span>Вопросы берутся из тестов тем курса. Убедитесь, что тесты созданы и опубликованы.</span>
          </div>

          <ActionButton action="confirm" class="final-preview-button" :label="CALC_BUTTON_TEXT" type="button" @click="previewQuestions" />
          <div v-if="questionsCalculation" class="final-calculation-result">
            <p>{{ CALC_SECTIONS_TEXT }}: {{ questionsCalculation.sectionsCount }}</p>
            <p>{{ CALC_QUESTIONS_TEXT }}: {{ questionsCalculation.questionsCount }}</p>
          </div>
        </aside>
      </div>
    </section>

    <aside class="final-side-panel">
      <section class="final-side-card">
        <h3>Информация о курсе</h3>
        <div class="final-info-row">
          <span>Название курса</span>
          <strong>{{ course?.title || "Без названия" }}</strong>
        </div>
        <div class="final-info-row">
          <span>Всего тем</span>
          <strong>{{ sections.length }}</strong>
        </div>
        <div class="final-info-row">
          <span>Всего подтем</span>
          <strong>{{ subtopicsCount }}</strong>
        </div>
        <div class="final-info-row">
          <span>Всего материалов</span>
          <strong>{{ materialsCount }}</strong>
        </div>
      </section>

      <section class="final-side-card">
        <h3>Об аттестации</h3>
        <div class="final-info-row final-info-row-inline">
          <span>Тип аттестации</span>
          <strong>Тестирование</strong>
        </div>
        <div class="final-info-row final-info-row-inline">
          <span>Время на прохождение</span>
          <strong>{{ draft.timeLimitMinutes || 0 }} минут</strong>
        </div>
        <div class="final-info-row final-info-row-inline">
          <span>Порог прохождения</span>
          <strong>{{ draft.passScorePercent || 0 }}%</strong>
        </div>
        <div class="final-info-row final-info-row-inline">
          <span>Количество попыток</span>
          <strong>{{ draft.maxAttempts || 0 }}</strong>
        </div>
        <div class="final-info-row final-info-row-inline">
          <span>Статус</span>
          <strong class="final-status">Черновик</strong>
        </div>

        <div class="final-advice">
          <Info :size="16" :stroke-width="2" />
          <div>
            <strong>Совет</strong>
            <p>Рекомендуемый порог прохождения — от 70%. Не делайте тест слишком длинным, оптимальное количество вопросов: 30-60.</p>
          </div>
        </div>
      </section>
    </aside>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ChevronDown, ChevronRight, Info } from "lucide-vue-next";
import { createAssessment, getAssessmentById, updateAssessment } from "@/api/assessments";
import { updateCourse } from "@/api/courses";
import { useToast } from "@/composables/useToast";
import ActionButton from "@/components/ui/ActionButton.vue";

const props = defineProps({
  course: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["course-updated", "assessment-saved"]);

const { showToast } = useToast();

const CALC_BUTTON_TEXT = "\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044c \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432";
const CALC_SECTIONS_TEXT = "\u0422\u0435\u043c \u0432 \u0440\u0430\u0441\u0447\u0435\u0442\u0435";
const CALC_QUESTIONS_TEXT = "\u0412\u043e\u043f\u0440\u043e\u0441\u043e\u0432 \u0432 \u0440\u0430\u0441\u0447\u0435\u0442\u0435";
const CALC_ALERT_TEXT = "\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432";

const sourceQuestionsBySectionId = ref({});
const saving = ref(false);
const questionsCalculation = ref(null);

const draft = reactive({
  assessmentId: null,
  title: "Итоговая аттестация по курсу",
  description: "",
  assessmentType: "testing",
  maxAttempts: 2,
  timeLimitMinutes: 90,
  passScorePercent: 75,
  shuffleQuestions: true,
  shuffleOptions: true,
  scope: "all",
  selectedSectionIds: [],
  sectionLimits: {},
  snapshot: "",
  dirty: false,
});

const sections = computed(() => props.course?.sections || []);
const includedSections = computed(() => {
  if (draft.scope === "selected") {
    const selected = new Set(draft.selectedSectionIds.map(Number));
    return sections.value.filter((section) => selected.has(Number(section.id)));
  }
  return sections.value;
});
const totalSelectedQuestions = computed(() =>
  includedSections.value.reduce((sum, section) => sum + Math.max(0, Number(getSectionLimit(section.id) || 0)), 0),
);
const subtopicsCount = computed(() => sections.value.reduce((sum, section) => sum + (section.topics?.length || 0), 0));
const materialsCount = computed(() =>
  sections.value.reduce((sum, section) => sum + (section.topics || []).filter((topic) => topic.hasMaterial).length, 0),
);

const serializeDraft = () =>
  JSON.stringify({
    assessmentId: draft.assessmentId || null,
    title: draft.title,
    description: draft.description,
    maxAttempts: Number(draft.maxAttempts || 0),
    timeLimitMinutes: Number(draft.timeLimitMinutes || 0),
    passScorePercent: Number(draft.passScorePercent || 0),
    shuffleQuestions: Boolean(draft.shuffleQuestions),
    shuffleOptions: Boolean(draft.shuffleOptions),
    scope: draft.scope,
    selectedSectionIds: [...draft.selectedSectionIds].map(Number).sort((a, b) => a - b),
    sectionLimits: { ...draft.sectionLimits },
  });

const getDefaultLimit = (sectionIndex) => {
  const limits = [15, 15, 10, 5, 5];
  return limits[sectionIndex] || 5;
};

const ensureSectionDefaults = () => {
  sections.value.forEach((section, index) => {
    if (draft.sectionLimits[section.id] === undefined) {
      draft.sectionLimits[section.id] = getDefaultLimit(index);
    }
  });
  if (!draft.selectedSectionIds.length) {
    draft.selectedSectionIds = sections.value.map((section) => Number(section.id));
  }
};

const applyAssessment = (assessment) => {
  draft.assessmentId = assessment?.id || props.course?.finalAssessmentId || null;
  draft.title = assessment?.title || draft.title;
  draft.description = assessment?.description || "";
  draft.timeLimitMinutes = Number(assessment?.time_limit_minutes ?? assessment?.timeLimitMinutes ?? draft.timeLimitMinutes);
  draft.passScorePercent = Number(assessment?.pass_score_percent ?? assessment?.passScorePercent ?? draft.passScorePercent);
  const maxAttempts = Number(assessment?.max_attempts ?? assessment?.maxAttempts ?? draft.maxAttempts);
  draft.maxAttempts = maxAttempts > 0 ? maxAttempts : 1;
  draft.snapshot = serializeDraft();
  draft.dirty = false;
};

watch(
  () => props.course,
  async (course) => {
    ensureSectionDefaults();
    draft.assessmentId = course?.finalAssessmentId || null;
    draft.title = draft.title || `Итоговая аттестация по курсу`;
    if (!course?.finalAssessmentId) {
      draft.snapshot = serializeDraft();
      draft.dirty = false;
      return;
    }
    try {
      const response = await getAssessmentById(course.finalAssessmentId);
      applyAssessment(response.assessment || {});
    } catch {
      draft.snapshot = serializeDraft();
      draft.dirty = false;
    }
  },
  { immediate: true },
);

watch(
  draft,
  () => {
    draft.dirty = serializeDraft() !== draft.snapshot;
  },
  { deep: true },
);

const getSectionLimit = (sectionId) => Number(draft.sectionLimits[sectionId] ?? 0);

const setSectionLimit = (sectionId, value) => {
  const nextValue = Math.max(0, Number(value || 0));
  draft.sectionLimits[sectionId] = Number.isFinite(nextValue) ? nextValue : 0;
};

const isSectionSelected = (sectionId) => draft.selectedSectionIds.map(Number).includes(Number(sectionId));

const toggleSection = (sectionId, checked) => {
  const id = Number(sectionId);
  const selected = new Set(draft.selectedSectionIds.map(Number));
  if (checked) {
    selected.add(id);
  } else {
    selected.delete(id);
  }
  draft.selectedSectionIds = Array.from(selected);
};

const mapAssessmentQuestion = (question) => {
  const questionType = question.question_type || question.questionType || "single";
  return {
    text: String(question.question_text || question.text || "").trim(),
    questionType,
    correctTextAnswer: questionType === "text" ? String(question.correct_text_answer || question.correctTextAnswer || "").trim() : "",
    options:
      questionType === "text"
        ? []
        : (question.options || []).map((option) => ({
            text: String(option.option_text || option.text || "").trim(),
            matchText: String(option.match_text || option.matchText || "").trim(),
            isCorrect: option.is_correct === 1 || option.isCorrect === true,
          })),
  };
};

const loadSectionQuestions = async (section) => {
  if (!section?.assessmentId) {
    sourceQuestionsBySectionId.value[section.id] = [];
    return [];
  }
  if (sourceQuestionsBySectionId.value[section.id]) {
    return sourceQuestionsBySectionId.value[section.id];
  }
  const response = await getAssessmentById(section.assessmentId);
  const questions = Array.isArray(response?.assessment?.questions) ? response.assessment.questions.map(mapAssessmentQuestion) : [];
  sourceQuestionsBySectionId.value[section.id] = questions;
  return questions;
};

const buildQuestions = async () => {
  const result = [];
  for (const section of includedSections.value) {
    const limit = getSectionLimit(section.id);
    if (limit <= 0) continue;
    const questions = await loadSectionQuestions(section);
    result.push(...questions.slice(0, limit));
  }
  return result;
};

const validateDraft = async () => {
  if (!draft.title.trim()) {
    showToast("Укажите название итоговой аттестации", "error");
    return false;
  }
  if (Number(draft.timeLimitMinutes || 0) < 1) {
    showToast("Укажите корректное время прохождения", "error");
    return false;
  }
  if (Number(draft.passScorePercent || 0) < 0 || Number(draft.passScorePercent || 0) > 100) {
    showToast("Порог прохождения должен быть от 0 до 100", "error");
    return false;
  }
  if (Number(draft.maxAttempts || 0) < 1) {
    showToast("Количество попыток должно быть не меньше 1", "error");
    return false;
  }
  if (!includedSections.value.length) {
    showToast("Выберите хотя бы одну тему для итоговой аттестации", "error");
    return false;
  }
  const questions = await buildQuestions();
  if (!questions.length) {
    showToast("В выбранных темах нет вопросов. Сначала настройте тесты тем.", "error");
    return false;
  }
  return questions;
};

const buildAssessmentPayload = (questions) => {
  const openAt = new Date();
  openAt.setDate(openAt.getDate() - 1);
  const closeAt = new Date();
  closeAt.setFullYear(closeAt.getFullYear() + 50);

  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    openAt: openAt.toISOString(),
    closeAt: closeAt.toISOString(),
    timeLimitMinutes: Number(draft.timeLimitMinutes || 90),
    passScorePercent: Number(draft.passScorePercent || 75),
    maxAttempts: Number(draft.maxAttempts || 1),
    branchIds: [],
    positionIds: [],
    userIds: [],
    questions,
  };
};

const savePendingChanges = async () => {
  if (saving.value) {
    return false;
  }

  const validationResult = await validateDraft();
  if (!validationResult) {
    return false;
  }

  saving.value = true;
  try {
    const payload = buildAssessmentPayload(validationResult);
    let assessmentId = draft.assessmentId || props.course?.finalAssessmentId || null;

    if (assessmentId) {
      await updateAssessment(assessmentId, payload);
    } else {
      const response = await createAssessment(payload);
      assessmentId = Number(response?.assessment?.id || response?.assessmentId || 0) || null;
      if (!assessmentId) {
        throw new Error("Не удалось получить ID итоговой аттестации");
      }
    }

    const response = await updateCourse(props.course.id, { finalAssessmentId: assessmentId });
    draft.assessmentId = assessmentId;
    draft.snapshot = serializeDraft();
    draft.dirty = false;
    emit("assessment-saved", assessmentId);
    if (response?.course) {
      emit("course-updated", response.course);
    }
    showToast("Итоговая аттестация сохранена", "success");
    return true;
  } catch (error) {
    showToast(error?.response?.data?.error || error?.message || "Не удалось сохранить итоговую аттестацию", "error");
    return false;
  } finally {
    saving.value = false;
  }
};

const previewQuestions = async () => {
  const questions = await buildQuestions();
  questionsCalculation.value = {
    sectionsCount: includedSections.value.length,
    questionsCount: questions.length,
  };
  window.alert(`${CALC_ALERT_TEXT}: ${questions.length}`);
};

defineExpose({
  savePendingChanges,
});
</script>

<style scoped>
.course-final-assessment-step {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 20px;
  color: #172033;
}

.final-main-panel,
.final-side-card,
.final-left-card,
.final-structure-card {
  border: 1px solid #e6eaf4;
  border-radius: 10px;
  background: #ffffff;
}

.final-main-panel {
  padding: 26px 24px 24px;
}

.final-heading h2,
.final-heading p,
.final-section h3,
.final-section-caption,
.final-side-card h3,
.final-structure-card h3,
.final-structure-card p,
.final-help-box p,
.final-advice p {
  margin: 0;
}

.final-heading h2 {
  font-size: 20px;
  line-height: 26px;
  font-weight: 800;
}

.final-heading p,
.final-section-caption {
  margin-top: 8px;
  color: #66708f;
  font-size: 14px;
  line-height: 20px;
}

.final-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 352px;
  gap: 20px;
  margin-top: 24px;
}

.final-left-card {
  overflow: hidden;
}

.final-section {
  padding: 20px 22px;
  border-bottom: 1px solid #e9ecf5;
}

.final-section:last-child {
  border-bottom: 0;
}

.final-section h3,
.final-side-card h3,
.final-structure-card h3 {
  font-size: 15px;
  line-height: 20px;
  font-weight: 800;
}

.final-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px 22px;
  margin-top: 18px;
}

.final-form-grid-compact {
  gap: 18px;
}

.final-field {
  position: relative;
  display: block;
  min-width: 0;
}

.final-field span {
  display: block;
  margin-bottom: 8px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.final-field b {
  color: #ef4444;
}

.final-field input,
.final-field select,
.final-field textarea {
  width: 100%;
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
}

.final-field input,
.final-field select {
  height: 42px;
  padding: 0 14px;
}

.final-field textarea {
  height: 76px;
  padding: 12px 14px;
  resize: none;
}

.final-field input:focus,
.final-field select:focus,
.final-field textarea:focus {
  outline: 0;
  border-color: #655cff;
  box-shadow: 0 0 0 3px rgba(101, 92, 255, 0.12);
}

.final-field small {
  position: absolute;
  right: 12px;
  bottom: 8px;
  color: #66708f;
  font-size: 12px;
}

.final-field em {
  display: block;
  margin-top: 8px;
  color: #66708f;
  font-size: 12px;
  font-style: normal;
}

.final-help-box,
.final-note,
.final-advice {
  display: flex;
  gap: 12px;
  border-radius: 8px;
}

.final-help-box {
  margin-top: 20px;
  padding: 16px;
  background: #f7f5ff;
  color: #655cff;
}

.final-help-box strong,
.final-advice strong {
  display: block;
  margin-bottom: 8px;
  color: #655cff;
  font-size: 14px;
}

.final-help-box p,
.final-advice p {
  color: #64708a;
  font-size: 13px;
  line-height: 19px;
}

.final-help-box p + p {
  margin-top: 4px;
}

.final-radio-row,
.final-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.final-radio-row {
  margin-top: 18px;
}

.final-radio-row input,
.final-checkbox-row input {
  width: 18px;
  height: 18px;
  accent-color: #655cff;
}

.final-radio-row strong {
  display: block;
  color: #172033;
  font-size: 14px;
}

.final-radio-row small {
  display: block;
  margin-top: 4px;
  color: #66708f;
  font-size: 13px;
  line-height: 18px;
}

.final-selected-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #e6eaf4;
  border-radius: 8px;
  background: #fbfcff;
}

.final-checkbox-row {
  align-items: center;
  color: #344054;
  font-size: 13px;
}

.final-structure-card {
  align-self: start;
  padding: 22px;
}

.final-structure-card p {
  margin-top: 10px;
  color: #66708f;
  font-size: 13px;
}

.final-topic-list {
  display: flex;
  flex-direction: column;
  margin-top: 22px;
  border: 1px solid #e6eaf4;
  border-radius: 8px;
  overflow: hidden;
}

.final-topic-item {
  min-height: 54px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-bottom: 1px solid #e6eaf4;
}

.final-topic-item:last-child {
  border-bottom: 0;
}

.final-topic-item strong {
  overflow: hidden;
  color: #172033;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.final-topic-item label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #66708f;
  font-size: 12px;
}

.final-topic-item input {
  width: 42px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: #f5f7fb;
  color: #172033;
  font-size: 12px;
  text-align: center;
}

.final-note {
  margin-top: 16px;
  padding: 14px;
  background: #f0f6ff;
  color: #4d6cff;
  font-size: 12px;
  line-height: 18px;
}

.final-calculation-result {
  margin-top: 10px;
  color: #66708f;
  font-size: 13px;
  line-height: 18px;
}

.final-calculation-result p {
  margin: 0;
}

.final-calculation-result p + p {
  margin-top: 4px;
}

.final-preview-button {
  height: 40px;
  margin-top: 14px;
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.final-side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.final-side-card {
  padding: 22px;
}

.final-info-row {
  display: grid;
  gap: 8px;
  margin-top: 20px;
}

.final-info-row-inline {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.final-info-row span {
  color: #66708f;
  font-size: 13px;
}

.final-info-row strong {
  color: #172033;
  font-size: 13px;
  line-height: 18px;
}

.final-status {
  justify-self: end;
  border-radius: 999px;
  padding: 6px 12px;
  background: #fff0df;
  color: #f28c28 !important;
}

.final-advice {
  margin-top: 24px;
  padding: 16px;
  background: #f7f5ff;
  color: #655cff;
}

@media (max-width: 1200px) {
  .course-final-assessment-step,
  .final-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .final-main-panel,
  .final-side-card,
  .final-structure-card {
    padding: 16px;
  }

  .final-form-grid {
    grid-template-columns: 1fr;
  }

  .final-topic-item {
    grid-template-columns: 18px minmax(0, 1fr);
  }

  .final-topic-item label,
  .final-topic-item > svg:last-child {
    grid-column: 2;
  }
}
</style>
