<template>
  <div class="container assessment-process">
    <!-- Header with Timer -->
    <div class="assessment-header">
      <div class="wrapper">
        <div class="header-content">
          <h1 class="assessment-title">{{ assessment?.title }}</h1>
          <div class="timer" :class="{ warning: timeRemaining < 300 }">
            {{ formatTime(timeRemaining) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Indicator -->
    <div class="progress-section" v-if="questions.length > 0">
      <div class="wrapper">
        <div class="progress-info">
          <span class="question-counter">Вопрос {{ currentQuestionIndex + 1 }} из {{ questions.length }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Question Content -->
    <div class="question-section">
      <div class="wrapper">
        <div class="question-content" v-if="currentQuestion">
          <h2 class="question-text">{{ currentQuestion.text }}</h2>

          <div v-if="currentQuestion.questionType === 'text'" class="text-answer-block">
            <label class="text-answer-label" :for="`text-answer-${currentQuestion.id}`">Ваш ответ</label>
            <textarea
              :id="`text-answer-${currentQuestion.id}`"
              v-model="selectedTextAnswer"
              class="text-answer-input"
              rows="4"
              placeholder="Введите ответ"
            ></textarea>
          </div>

          <div v-else-if="currentQuestion.questionType === 'matching'" class="matching-block">
            <div v-for="answer in currentQuestion.answers" :key="answer.id" class="matching-row">
              <div class="matching-left">{{ answer.text }}</div>
              <select
                class="matching-select"
                :value="selectedMatchingPairs[answer.id] || ''"
                @change="(event) => handleMatchingChange(answer.id, event.target.value)"
              >
                <option value="">Выберите пару</option>
                <option v-for="option in getMatchingOptions(answer.id)" :key="option.id" :value="option.id">
                  {{ option.text }}
                </option>
              </select>
            </div>
          </div>

          <div v-else class="answers-list" :class="{ multiple: isMultiChoice(currentQuestion.questionType) }">
            <label
              v-for="answer in currentQuestion.answers"
              :key="answer.id"
              class="answer-option"
              :class="{
                selected: isMultiChoice(currentQuestion.questionType) ? selectedMultipleAnswers.includes(answer.id) : selectedAnswer === answer.id,
              }"
              @click.prevent="toggleAnswer(answer.id)"
            >
              <input
                v-if="isMultiChoice(currentQuestion.questionType)"
                type="checkbox"
                :checked="selectedMultipleAnswers.includes(answer.id)"
                style="display: none"
              />
              <input
                v-else
                type="radio"
                :name="`question-${currentQuestion.id}`"
                :value="answer.id"
                :checked="selectedAnswer === answer.id"
                style="display: none"
              />
              <div class="indicator" :class="{ checkbox: isMultiChoice(currentQuestion.questionType) }"></div>
              <span class="answer-text">{{ answer.text }}</span>
            </label>
          </div>
        </div>

        <div class="loading-state" v-else>
          <div class="spinner"></div>
          <p class="loading-text">Загрузка вопроса...</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="navigation-section">
      <div class="nav-buttons" v-if="currentQuestion">
        <button
          v-if="currentQuestionIndex < questions.length - 1"
          class="btn btn-primary btn-full"
          :disabled="!canProceedCurrent || isSaving"
          @click="nextQuestion"
        >
          Далее
        </button>

        <button v-else class="btn btn-primary btn-full" :disabled="!canProceedCurrent || isSaving" @click="showFinishConfirmation">Завершить</button>
      </div>
    </div>

    <!-- Question Dots -->
    <div class="dots-section" v-if="!awaitingStart && questions.length > 0">
      <div class="question-dots">
        <div
          v-for="(question, index) in questions"
          :key="question.id"
          class="question-dot"
          :class="{
            current: index === currentQuestionIndex,
            answered: userAnswers[index] !== undefined,
          }"
        ></div>
      </div>
    </div>
  </div>

  <!-- Time Up Modal -->
  <div v-if="showTimeUpModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-body text-center">
        <h2 class="title-medium mb-16">Время вышло!</h2>
        <p class="body-medium mb-20">Аттестация будет завершена автоматически.</p>
        <button class="btn btn-primary btn-full" @click="finishAssessment">Посмотреть результаты</button>
      </div>
    </div>
  </div>

  <!-- Finish Confirmation Modal -->
  <div v-if="showFinishModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-body text-center">
        <h2 class="title-medium mb-16">Завершить аттестацию?</h2>
        <p class="body-medium mb-20">Вы уверены, что хотите завершить аттестацию и посмотреть результаты?</p>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showFinishModal = false">Продолжить</button>
          <button class="btn btn-primary" @click="confirmFinishAssessment">Завершить</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Early Exit Warning Modal -->
  <div v-if="showExitWarningModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-body text-center">
        <h2 class="title-medium mb-16 text-warning">⚠️ Преждевременное завершение</h2>
        <p class="body-medium mb-16">Если вы покинете аттестацию сейчас:</p>
        <ul class="warning-list mb-20">
          <li>• Результат будет <strong>0%</strong></li>
          <li>• Попытка будет <strong>засчитана</strong></li>
          <li>• Ответы будут <strong>аннулированы</strong></li>
        </ul>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showExitWarningModal = false">Продолжить тест</button>
          <button class="btn btn-primary" @click="confirmEarlyExit">Всё равно выйти</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";
import { apiClient } from "../services/apiClient";

export default {
  name: "AssessmentProcessView",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const assessment = ref(null);
    const questions = ref([]);
    const currentQuestionIndex = ref(0);
    const selectedAnswer = ref(null);
    const selectedMultipleAnswers = ref([]);
    const selectedTextAnswer = ref("");
    const selectedMatchingPairs = ref({});
    const userAnswers = ref([]);
    const attemptId = ref(null);
    const awaitingStart = ref(true);
    const timeRemaining = ref(0);
    const showTimeUpModal = ref(false);
    const showFinishModal = ref(false);
    const showExitWarningModal = ref(false);
    const timer = ref(null);
    const isSaving = ref(false);
    const isCompleted = ref(false);
    const PROGRESS_STORAGE_KEY = "assessmentAttemptProgress";

    const assessmentId = computed(() => Number(route.params.id));

    const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || null);
    const isMultiChoice = (questionType) => questionType === "multiple";

    const progressPercentage = computed(() => {
      if (!questions.value.length) {
        return 0;
      }
      return ((currentQuestionIndex.value + 1) / questions.value.length) * 100;
    });

    const canProceedCurrent = computed(() => {
      const question = currentQuestion.value;
      if (!question) {
        return false;
      }
      if (question.questionType === "matching") {
        const total = question.answers?.length || 0;
        const selectedCount = Object.keys(selectedMatchingPairs.value || {}).length;
        return total > 0 && selectedCount === total;
      }
      if (isMultiChoice(question.questionType)) {
        return selectedMultipleAnswers.value.length > 0;
      }
      if (question.questionType === "text") {
        return selectedTextAnswer.value.trim().length > 0;
      }
      return selectedAnswer.value != null;
    });

    function formatTime(seconds) {
      if (seconds == null || seconds < 0) {
        return "—";
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    const hasProgressStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

    const readProgressStore = () => {
      if (!hasProgressStorage()) {
        return {};
      }
      try {
        const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!raw) {
          return {};
        }
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed ? parsed : {};
      } catch (error) {
        console.warn("Не удалось прочитать прогресс аттестации", error);
        return {};
      }
    };

    const writeProgressStore = (store) => {
      if (!hasProgressStorage()) {
        return;
      }
      try {
        window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
      } catch (error) {
        console.warn("Не удалось сохранить прогресс аттестации", error);
      }
    };

    const getAttemptProgress = (attempt) => {
      if (!attempt) {
        return null;
      }
      const store = readProgressStore();
      return store[String(attempt)] || null;
    };

    const saveAttemptProgress = (attempt, patch) => {
      if (!attempt || !patch) {
        return;
      }
      const store = readProgressStore();
      const key = String(attempt);
      const current = store[key] || {};
      store[key] = { ...current, ...patch };
      writeProgressStore(store);
    };

    const clearAttemptProgress = (attempt) => {
      if (!attempt) {
        return;
      }
      const store = readProgressStore();
      const key = String(attempt);
      if (store[key]) {
        delete store[key];
        writeProgressStore(store);
      }
    };

    const normalizeStoredAnswer = (question, stored) => {
      if (!stored || stored.type !== question.questionType) {
        return null;
      }
      if (question.questionType === "single") {
        return Number.isInteger(stored.value) ? { type: "single", value: stored.value } : null;
      }
      if (question.questionType === "matching") {
        if (!stored.value || typeof stored.value !== "object") {
          return null;
        }
        const normalized = {};
        Object.entries(stored.value).forEach(([left, right]) => {
          const leftId = Number(left);
          const rightId = Number(right);
          if (Number.isInteger(leftId) && leftId > 0 && Number.isInteger(rightId) && rightId > 0) {
            normalized[leftId] = rightId;
          }
        });
        return Object.keys(normalized).length ? { type: "matching", value: normalized } : null;
      }
      if (isMultiChoice(question.questionType)) {
        if (!Array.isArray(stored.value)) {
          return null;
        }
        const normalized = stored.value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
        return normalized.length ? { type: question.questionType, value: normalized } : null;
      }
      if (question.questionType === "text") {
        return typeof stored.value === "string" && stored.value.trim().length ? { type: "text", value: stored.value } : null;
      }
      return null;
    };

    const buildAnswerStore = () => {
      const answers = {};
      questions.value.forEach((question, index) => {
        const answer = userAnswers.value[index];
        if (answer) {
          answers[String(question.id)] = answer;
        }
      });
      return answers;
    };

    const applyStoredAnswers = (storedAnswers) => {
      if (!storedAnswers || typeof storedAnswers !== "object") {
        return;
      }
      userAnswers.value = questions.value.map((question, index) => {
        const stored = storedAnswers[String(question.id)];
        const normalized = normalizeStoredAnswer(question, stored);
        return normalized || userAnswers.value[index] || null;
      });
    };

    const persistAnswers = () => {
      if (!attemptId.value) {
        return;
      }
      saveAttemptProgress(attemptId.value, { answers: buildAnswerStore() });
    };

    const applyStoredQuestionOrder = (progress) => {
      if (!progress?.questionOrder?.length || !questions.value.length) {
        return;
      }
      const orderIds = progress.questionOrder;
      const map = new Map(questions.value.map((question, index) => [question.id, { question, answer: userAnswers.value[index] || null }]));
      const orderedQuestions = [];
      const orderedAnswers = [];
      orderIds.forEach((id) => {
        if (map.has(id)) {
          const entry = map.get(id);
          orderedQuestions.push(entry.question);
          orderedAnswers.push(entry.answer);
          map.delete(id);
        }
      });
      if (map.size) {
        map.forEach((entry) => {
          orderedQuestions.push(entry.question);
          orderedAnswers.push(entry.answer);
        });
      }
      if (orderedQuestions.length) {
        questions.value = orderedQuestions;
        userAnswers.value = orderedAnswers;
      }
    };

    const resolveResumeIndex = (progress) => {
      if (progress && Number.isInteger(progress.currentQuestionIndex)) {
        const idx = progress.currentQuestionIndex;
        if (idx >= 0 && idx < questions.value.length) {
          return idx;
        }
      }
      const firstUnanswered = userAnswers.value.findIndex((answer) => answer == null);
      if (firstUnanswered >= 0) {
        return firstUnanswered;
      }
      return Math.max(questions.value.length - 1, 0);
    };

    const persistQuestionOrder = () => {
      if (!attemptId.value || !questions.value.length) {
        return;
      }
      saveAttemptProgress(attemptId.value, {
        questionOrder: questions.value.map((question) => question.id),
        currentQuestionIndex: currentQuestionIndex.value,
      });
    };

    const resetSelectionState = () => {
      selectedAnswer.value = null;
      selectedMultipleAnswers.value = [];
      selectedTextAnswer.value = "";
      selectedMatchingPairs.value = {};
    };

    const applyStoredAnswer = (index) => {
      resetSelectionState();
      const question = questions.value[index];
      if (!question) {
        return;
      }
      const stored = userAnswers.value[index];
      if (!stored || stored.type !== question.questionType) {
        return;
      }

      if (question.questionType === "single") {
        selectedAnswer.value = stored.value ?? null;
      } else if (question.questionType === "matching") {
        selectedMatchingPairs.value = stored.value && typeof stored.value === "object" ? { ...stored.value } : {};
      } else if (isMultiChoice(question.questionType)) {
        selectedMultipleAnswers.value = Array.isArray(stored.value) ? [...stored.value] : [];
      } else {
        selectedTextAnswer.value = stored.value || "";
      }
    };

    const getMatchingOptions = (leftId) => {
      const question = currentQuestion.value;
      if (!question || question.questionType !== "matching") {
        return [];
      }
      const selected = selectedMatchingPairs.value || {};
      const usedIds = new Set(
        Object.entries(selected)
          .filter(([key]) => Number(key) !== Number(leftId))
          .map(([, value]) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      );
      return (question.answers || [])
        .map((answer) => ({
          id: answer.id,
          text: answer.matchText || answer.text,
        }))
        .filter((option) => !usedIds.has(option.id) || Number(selected[leftId]) === option.id);
    };

    const handleMatchingChange = (leftId, rightValue) => {
      const question = currentQuestion.value;
      if (!question || question.questionType !== "matching") {
        return;
      }
      const rightId = Number(rightValue);
      const next = { ...selectedMatchingPairs.value };
      if (!Number.isInteger(rightId) || rightId <= 0) {
        delete next[leftId];
      } else {
        next[leftId] = rightId;
      }
      selectedMatchingPairs.value = next;

      const leftIds = (question.answers || []).map((answer) => answer.id);
      const selectedRightIds = new Set(
        Object.values(next)
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      );
      const remainingLeft = leftIds.filter((id) => !next[id]);
      const remainingRight = (question.answers || []).map((answer) => answer.id).filter((id) => !selectedRightIds.has(id));

      if (remainingLeft.length === 1 && remainingRight.length === 1) {
        next[remainingLeft[0]] = remainingRight[0];
        selectedMatchingPairs.value = { ...next };
      }

      syncCurrentAnswer();
      telegramStore.hapticFeedback("selection");
    };

    function toggleAnswer(optionId) {
      if (!currentQuestion.value) {
        return;
      }
      if (isMultiChoice(currentQuestion.value.questionType)) {
        const index = selectedMultipleAnswers.value.indexOf(optionId);
        if (index === -1) {
          selectedMultipleAnswers.value.push(optionId);
        } else {
          selectedMultipleAnswers.value.splice(index, 1);
        }
      } else {
        selectedAnswer.value = optionId;
      }
      syncCurrentAnswer();
      telegramStore.hapticFeedback("selection");
    }

    function syncCurrentAnswer() {
      const attempt = attemptId.value;
      const question = currentQuestion.value;
      if (!attempt || !question) {
        return false;
      }

      const index = currentQuestionIndex.value;
      let snapshot = null;

      if (question.questionType === "single") {
        if (selectedAnswer.value == null) {
          return false;
        }
        const optionId = selectedAnswer.value;
        snapshot = optionId;
      } else if (isMultiChoice(question.questionType)) {
        if (!selectedMultipleAnswers.value.length) {
          return false;
        }
        const normalized = [...selectedMultipleAnswers.value].map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
        normalized.sort((a, b) => a - b);
        snapshot = normalized;
      } else if (question.questionType === "matching") {
        const pairs = selectedMatchingPairs.value || {};
        const leftIds = (question.answers || []).map((answer) => answer.id);
        const selectedCount = Object.keys(pairs).length;
        if (leftIds.length === 0 || selectedCount !== leftIds.length) {
          return false;
        }
        snapshot = {};
        leftIds.forEach((leftId) => {
          const rightId = Number(pairs[leftId]);
          if (Number.isInteger(rightId) && rightId > 0) {
            snapshot[leftId] = rightId;
          }
        });
      } else {
        const textValue = selectedTextAnswer.value ? selectedTextAnswer.value.trim() : "";
        if (!textValue) {
          return false;
        }
        snapshot = textValue;
      }

      if (isMultiChoice(question.questionType) && Array.isArray(snapshot)) {
        userAnswers.value[index] = { type: question.questionType, value: [...snapshot] };
      } else if (question.questionType === "matching" && snapshot && typeof snapshot === "object") {
        userAnswers.value[index] = { type: question.questionType, value: { ...snapshot } };
      } else {
        userAnswers.value[index] = { type: question.questionType, value: snapshot };
      }
      persistAnswers();
      return true;
    }

    async function nextQuestion() {
      if (!canProceedCurrent.value || isSaving.value) {
        return;
      }

      syncCurrentAnswer();

      currentQuestionIndex.value += 1;
      applyStoredAnswer(currentQuestionIndex.value);
      telegramStore.hapticFeedback("impact", "light");
      persistQuestionOrder();
    }

    function showFinishConfirmation() {
      if (isSaving.value) {
        return;
      }
      showFinishModal.value = true;
      telegramStore.hapticFeedback("impact", "light");
    }

    async function confirmFinishAssessment() {
      showFinishModal.value = false;
      await finishAssessment();
    }

    function handleEarlyExit() {
      if (isSaving.value) {
        return;
      }
      showExitWarningModal.value = true;
      telegramStore.hapticFeedback("notification", "warning");
    }

    async function confirmEarlyExit() {
      showExitWarningModal.value = false;
      await finishAssessment(true);
    }

    async function finishAssessment(isEarlyExit = false) {
      if (isCompleted.value || isSaving.value) {
        return;
      }
      isCompleted.value = true;
      isSaving.value = true;

      try {
        // Сохраняем текущий ответ если он есть
        if (canProceedCurrent.value) {
          try {
            syncCurrentAnswer();
          } catch (error) {
            console.warn("Не удалось сохранить последний ответ перед завершением", error);
            // Продолжаем завершение
          }
        }
      } catch (error) {
        console.warn("Ошибка при попытке сохранить ответ", error);
      }

      if (timer.value) {
        clearInterval(timer.value);
      }

      const attempt = attemptId.value;
      if (attempt) {
        clearAttemptProgress(attempt);
      }

      // Дожидаемся завершения попытки перед редиректом
      if (attempt) {
        try {
          const answersPayload = buildBatchPayload();
          if (answersPayload.length) {
            await apiClient.submitAssessmentAnswersBatch(assessmentId.value, attempt, { answers: answersPayload });
          }
          await apiClient.completeAssessmentAttempt(assessmentId.value, attempt);
          // Увеличенная задержка для гарантии записи данных в БД
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error("Не удалось завершить попытку", error);
          telegramStore.showAlert("Не удалось завершить аттестацию");
          isCompleted.value = false;
          isSaving.value = false;
          return;
        }
      }

      isSaving.value = false;
      document.body.style.overflow = "";
      telegramStore.hapticFeedback("impact", "medium");

      const query = { fromAssessment: "true" };
      if (attemptId.value) {
        query.attemptId = String(attemptId.value);
      }
      if (isEarlyExit) {
        query.earlyExit = "true";
      }

      router.push({
        path: `/assessment-results/${assessmentId.value}`,
        query,
      });
    }

    function startTimer() {
      if (timer.value) {
        clearInterval(timer.value);
      }

      if (timeRemaining.value == null || timeRemaining.value <= 0) {
        return;
      }

      timer.value = setInterval(() => {
        if (timeRemaining.value == null) {
          return;
        }

        if (timeRemaining.value > 0) {
          timeRemaining.value -= 1;

          if (timeRemaining.value === 300) {
            telegramStore.hapticFeedback("notification", "warning");
          }

          if (timeRemaining.value === 0) {
            showTimeUpModal.value = true;
            telegramStore.hapticFeedback("notification", "error");
            finishAssessment();
          }
        }
      }, 1000);
    }

    async function loadAssessment() {
      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        const response = await apiClient.getUserAssessment(assessmentId.value);
        const payload = response?.assessment;
        if (!payload) {
          throw new Error("Аттестация недоступна");
        }

        const timeLimitSeconds = payload.timeLimitMinutes != null ? Number(payload.timeLimitMinutes) * 60 : null;

        assessment.value = {
          id: payload.id,
          title: payload.title,
          threshold: Number(payload.passScorePercent || 0),
          timeLimitSeconds,
        };

        questions.value = (payload.questions || []).map((question) => ({
          id: question.id,
          text: question.text,
          questionType: question.questionType || "single",
          answers: (question.options || []).map((option) => ({
            id: option.id,
            text: option.text,
            matchText: option.matchText || "",
          })),
        }));

        const metaMap = new Map((payload.questions || []).map((question) => [question.id, question]));
        userAnswers.value = questions.value.map((question) => {
          const meta = metaMap.get(question.id);
          if (!meta) {
            return null;
          }
          if (question.questionType === "single" && meta.selectedOptionId != null) {
            return { type: "single", value: meta.selectedOptionId };
          }
          if (isMultiChoice(question.questionType) && Array.isArray(meta.selectedOptionIds) && meta.selectedOptionIds.length) {
            const normalized = meta.selectedOptionIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
            normalized.sort((a, b) => a - b);
            return { type: question.questionType, value: normalized };
          }
          if (question.questionType === "matching" && meta.selectedMatchPairs && typeof meta.selectedMatchPairs === "object") {
            const normalized = {};
            Object.entries(meta.selectedMatchPairs).forEach(([left, right]) => {
              const leftId = Number(left);
              const rightId = Number(right);
              if (Number.isInteger(leftId) && leftId > 0 && Number.isInteger(rightId) && rightId > 0) {
                normalized[leftId] = rightId;
              }
            });
            if (Object.keys(normalized).length) {
              return { type: "matching", value: normalized };
            }
          }
          if (question.questionType === "text" && meta.textAnswer) {
            return { type: "text", value: meta.textAnswer };
          }
          return null;
        });

        if (payload.latestAttempt && payload.latestAttempt.status === "in_progress") {
          // Есть активная попытка - продолжаем её
          attemptId.value = payload.latestAttempt.id;
          const remaining = payload.latestAttempt.remainingSeconds;
          timeRemaining.value = Number.isFinite(remaining) ? Number(remaining) : timeLimitSeconds;

          // НЕ применяем сохраненный порядок из localStorage - используем порядок из БД
          const storedProgress = getAttemptProgress(attemptId.value);
          applyStoredAnswers(storedProgress?.answers);
          const resumeIndex = resolveResumeIndex(storedProgress);
          currentQuestionIndex.value = resumeIndex;
          applyStoredAnswer(resumeIndex);

          // Не в режиме ожидания - попытка уже начата
          awaitingStart.value = false;
          // Сохраняем текущий порядок вопросов в localStorage (для отслеживания позиции)
          persistQuestionOrder();
          persistAnswers();
        } else {
          if (payload.latestAttempt?.id) {
            clearAttemptProgress(payload.latestAttempt.id);
          }
          // Нет активной попытки - запускаем новую
          awaitingStart.value = true;
          attemptId.value = null;
          timeRemaining.value = timeLimitSeconds;
          // Запускаем попытку автоматически
          await startAttempt();
        }

        if (timeRemaining.value == null) {
          timeRemaining.value = 0;
        }

        if (attemptId.value) {
          startTimer();
        }
        return true;
      } catch (error) {
        console.error("Не удалось загрузить аттестацию", error);
        telegramStore.showAlert(error.message || "Не удалось загрузить аттестацию");
        document.body.style.overflow = "";
        router.replace("/assessments");
        return false;
      }
    }

    async function startAttempt() {
      if (attemptId.value || !assessmentId.value) return;
      try {
        const response = await apiClient.startAssessmentAttempt(assessmentId.value);
        const attempt = response?.attempt || response;
        attemptId.value = attempt?.id || null;
        clearAttemptProgress(attemptId.value);

        // Перезагружаем аттестацию чтобы получить правильный порядок вопросов
        // который был сохранен при создании попытки
        const assessmentResponse = await apiClient.getUserAssessment(assessmentId.value);
        const payload = assessmentResponse?.assessment;
        if (!payload) {
          throw new Error("Не удалось загрузить вопросы");
        }

        // Обновляем вопросы с правильным порядком
        questions.value = (payload.questions || []).map((question) => ({
          id: question.id,
          text: question.text,
          questionType: question.questionType || "single",
          answers: (question.options || []).map((option) => ({
            id: option.id,
            text: option.text,
            matchText: option.matchText || "",
          })),
        }));

        const remaining = attempt?.remainingSeconds;
        const timeLimitSeconds = assessment.value?.timeLimitSeconds || null;
        timeRemaining.value = Number.isFinite(remaining) ? Number(remaining) : timeLimitSeconds;
        userAnswers.value = new Array(questions.value.length).fill(null);
        currentQuestionIndex.value = 0;
        resetSelectionState();
        awaitingStart.value = false;

        // Сохраняем новый порядок вопросов после перезагрузки
        persistQuestionOrder();
        persistAnswers();
        startTimer();
      } catch (attemptError) {
        if (attemptError.status === 409 && attemptError.code === "THEORY_NOT_COMPLETED") {
          telegramStore.showAlert(attemptError.message || "Сначала изучите обязательную теорию");
          router.replace(`/assessment/${assessmentId.value}/theory`);
          return false;
        }
        console.error("Не удалось начать попытку", attemptError);
        telegramStore.showAlert(attemptError.message || "Не удалось начать попытку");
      }
    }

    onMounted(async () => {
      const ready = await loadAssessment();
      if (!ready) {
        return;
      }

      telegramStore.hideMainButton();
      telegramStore.showBackButton(handleEarlyExit);

      document.body.style.overflow = "hidden";

      const handleBeforeUnload = () => {
        document.body.style.overflow = "";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      window._assessmentBeforeUnloadHandler = handleBeforeUnload;
    });

    const buildBatchPayload = () => {
      const answers = [];
      questions.value.forEach((question, index) => {
        const stored = userAnswers.value[index];
        if (!stored || stored.type !== question.questionType) {
          return;
        }
        if (stored.type === "single" && stored.value != null) {
          answers.push({ questionId: question.id, optionId: stored.value });
        } else if (stored.type === "multiple" && Array.isArray(stored.value) && stored.value.length) {
          answers.push({ questionId: question.id, optionIds: stored.value });
        } else if (stored.type === "matching" && stored.value && typeof stored.value === "object") {
          const matchPairs = Object.entries(stored.value)
            .map(([leftId, rightId]) => ({
              leftOptionId: Number(leftId),
              rightOptionId: Number(rightId),
            }))
            .filter(
              (pair) =>
                Number.isInteger(pair.leftOptionId) && pair.leftOptionId > 0 && Number.isInteger(pair.rightOptionId) && pair.rightOptionId > 0,
            );
          if (matchPairs.length) {
            answers.push({ questionId: question.id, matchPairs });
          }
        } else if (stored.type === "text" && stored.value && stored.value.trim()) {
          answers.push({ questionId: question.id, textAnswer: stored.value });
        }
      });
      return answers;
    };

    watch(
      currentQuestionIndex,
      (newIndex) => {
        if (!attemptId.value) {
          return;
        }
        saveAttemptProgress(attemptId.value, { currentQuestionIndex: newIndex });
        applyStoredAnswer(newIndex);
      },
      { flush: "post" },
    );

    watch(
      selectedAnswer,
      () => {
        if (currentQuestion.value?.questionType === "single") {
          syncCurrentAnswer();
        }
      },
      { flush: "post" },
    );

    watch(
      selectedMultipleAnswers,
      () => {
        if (isMultiChoice(currentQuestion.value?.questionType)) {
          syncCurrentAnswer();
        }
      },
      { deep: true, flush: "post" },
    );

    watch(
      selectedMatchingPairs,
      () => {
        if (currentQuestion.value?.questionType === "matching") {
          syncCurrentAnswer();
        }
      },
      { deep: true, flush: "post" },
    );

    let textSyncTimer = null;
    watch(
      selectedTextAnswer,
      () => {
        if (currentQuestion.value?.questionType !== "text") {
          return;
        }
        if (textSyncTimer) {
          clearTimeout(textSyncTimer);
        }
        textSyncTimer = setTimeout(() => {
          syncCurrentAnswer();
        }, 400);
      },
      { flush: "post" },
    );

    onUnmounted(() => {
      if (timer.value) {
        clearInterval(timer.value);
      }
      if (textSyncTimer) {
        clearTimeout(textSyncTimer);
      }

      document.body.style.overflow = "";

      if (window._assessmentBeforeUnloadHandler) {
        window.removeEventListener("beforeunload", window._assessmentBeforeUnloadHandler);
        delete window._assessmentBeforeUnloadHandler;
      }
    });

    return {
      assessment,
      questions,
      currentQuestionIndex,
      selectedAnswer,
      selectedMultipleAnswers,
      selectedMatchingPairs,
      selectedTextAnswer,
      userAnswers,
      timeRemaining,
      showTimeUpModal,
      showFinishModal,
      showExitWarningModal,
      currentQuestion,
      progressPercentage,
      canProceedCurrent,
      formatTime,
      isMultiChoice,
      getMatchingOptions,
      handleMatchingChange,
      toggleAnswer,
      nextQuestion,
      finishAssessment,
      showFinishConfirmation,
      confirmFinishAssessment,
      handleEarlyExit,
      confirmEarlyExit,
      startAttempt,
      awaitingStart,
      isSaving,
    };
  },
};
</script>

<style scoped>
.assessment-process {
  min-height: 100vh;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.assessment-header {
  flex-shrink: 0;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--divider);
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 768px;
  margin: 0 auto;
}

.assessment-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  margin-right: 16px;
}

.timer {
  background-color: var(--accent-blue);
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  transition: all 0.3s ease;
}

.timer.warning {
  background-color: var(--error);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-section {
  flex-shrink: 0;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--divider);
}

.progress-info {
  margin-bottom: 8px;
  max-width: 768px;
  margin-left: auto;
  margin-right: auto;
}

.question-counter {
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: var(--divider);
  border-radius: 3px;
  overflow: hidden;
  max-width: 768px;
  margin: 0 auto;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-blue);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.question-section {
  flex: 1;
  overflow-y: auto;
}

.question-content {
  max-width: 768px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.question-text {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 24px 0;
  color: var(--text-primary);
}

.matching-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.matching-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 12px;
}

.matching-left {
  font-size: 16px;
  color: var(--text-primary);
}

.matching-select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--divider);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.answers-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.answer-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
  background-color: var(--bg-secondary);
  border: 2px solid var(--divider);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
  user-select: none;
}

.answer-option:hover {
  border-color: var(--accent-blue);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.1);
}

.answer-option.selected {
  border-color: var(--accent-blue);
  background-color: rgba(0, 136, 204, 0.05);
  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.15);
}

.answer-text {
  flex: 1;
  font-size: 16px;
  line-height: 1.4;
  color: var(--text-primary);
}

.answers-list.multiple .answer-option {
  align-items: center;
}

.indicator {
  width: 20px;
  height: 20px;
  border: 2px solid var(--divider);
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

.indicator.checkbox {
  border-radius: 6px;
}

.answer-option.selected .indicator {
  border-color: var(--accent-blue);
}

.answer-option.selected .indicator::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background-color: var(--accent-blue);
  border-radius: 50%;
}

.indicator.checkbox::after {
  border-radius: 4px;
}

.text-answer-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-answer-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.text-answer-input {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.text-answer-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.15);
}

.navigation-section {
  flex-shrink: 0;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--divider);
  padding: 16px;
  backdrop-filter: blur(10px);
}

.nav-buttons {
  max-width: 768px;
  margin: 0 auto;
}

.dots-section {
  flex-shrink: 0;
  background-color: var(--bg-primary);
  padding: 12px 16px 16px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.loading-text {
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--divider);
  border-top: 4px solid var(--accent-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.question-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 768px;
  margin: 0 auto;
}

.question-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--divider);
  transition: all 0.2s ease;
}

.question-dot.current {
  background-color: var(--accent-blue);
  transform: scale(1.3);
  box-shadow: 0 0 8px rgba(0, 136, 204, 0.4);
}

.question-dot.answered {
  background-color: var(--success);
}

.text-warning {
  color: var(--warning, #ff9500) !important;
}

.warning-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  text-align: left;
  background: rgba(255, 149, 0, 0.1);
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid var(--warning, #ff9500);
}

.warning-list li {
  margin: 8px 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
}

.warning-list strong {
  color: var(--warning, #ff9500);
  font-weight: 600;
}

@media (max-width: 480px) {
  .assessment-title {
    font-size: 16px;
  }

  .timer {
    font-size: 13px;
    padding: 6px 10px;
    min-width: 55px;
  }

  .question-text {
    font-size: 24px;
  }

  .answer-text {
    font-size: 15px;
  }

  .matching-row {
    grid-template-columns: 1fr;
  }

  .answer-option {
    padding: 8px 12px;
    gap: 8px;
  }

  .indicator {
    width: 18px;
    height: 18px;
  }

  .answer-option.selected .indicator::after {
    width: 10px;
    height: 10px;
    top: 2px;
    left: 2px;
  }

  .navigation-section {
    padding: 12px;
  }

  .dots-section {
    padding: 8px 12px 12px;
  }

  .modal-content {
    margin: 16px;
    padding: 24px 20px;
  }
}

@media (max-height: 700px) {
  .answer-option {
    padding: 8px 12px;
  }

  .navigation-section {
    padding: 12px 16px;
  }

  .dots-section {
    padding: 8px 16px 12px;
  }
}
</style>
