<template>
  <div>
    <Preloader v-if="loading" />
    <div v-else class="question-view">
      <!-- Категория и тип -->
      <div class="badges-row">
        <span v-if="question.category_name" class="badge badge-category">
          {{ question.category_name }}
        </span>
        <span class="badge badge-type">
          {{ getQuestionTypeLabel(question.question_type) }}
        </span>
      </div>

      <!-- Текст вопроса -->
      <div class="question-text-block">
        <p class="question-text-content">{{ question.question_text }}</p>
      </div>

      <!-- Эталонный ответ для текстового типа -->
      <div v-if="question.question_type === 'text'" class="answer-section">
        <h4 class="section-title">Эталонный ответ:</h4>
        <div class="correct-answer-box">
          <span class="answer-text">{{ question.correct_text_answer }}</span>
        </div>
        <p class="section-hint">Ответ сотрудника будет сравниваться с этим текстом</p>
      </div>

      <!-- Варианты ответов для single и multiple -->
      <div v-if="question.question_type !== 'text' && question.options && question.options.length > 0" class="options-section">
        <h4 class="section-title">
          Варианты ответов:
          <span v-if="question.question_type === 'multiple'" class="multiple-hint"> (несколько правильных) </span>
        </h4>
        <div class="options-list">
          <div v-for="(option, index) in question.options" :key="option.id" class="option-item" :class="{ 'option-correct': option.is_correct }">
            <span class="option-number">{{ index + 1 }}.</span>
            <span class="option-text">{{ option.option_text }}</span>
            <span v-if="option.is_correct" class="option-badge"><Icon name="check" />Правильный</span>
          </div>
        </div>
      </div>

      <!-- Метаданные -->
      <div class="metadata">
        <div>Создан: {{ formatDate(question.created_at) }}</div>
        <div v-if="question.updated_at !== question.created_at">Обновлен: {{ formatDate(question.updated_at) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getQuestionById } from "../api/questionBank";
import Preloader from "./ui/Preloader.vue";
import Icon from "./ui/Icon.vue";
import { useToast } from "../composables/useToast";

const props = defineProps({
  questionId: {
    type: Number,
    required: true,
  },
});

const loading = ref(false);
const question = ref({
  question_text: "",
  question_type: "single",
  category_name: "",
  correct_text_answer: "",
  options: [],
  created_at: "",
  updated_at: "",
});
const { showToast } = useToast();

const getQuestionTypeLabel = (type) => {
  const labels = {
    single: "Один вариант",
    multiple: "Множественный выбор",
    text: "Текстовый ответ",
  };
  return labels[type] || type;
};

const loadQuestion = async () => {
  loading.value = true;
  try {
    const data = await getQuestionById(props.questionId);
    question.value = data.question;
  } catch (error) {
    console.error("Load question error:", error);
    showToast("Ошибка загрузки вопроса", "error");
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(() => {
  loadQuestion();
});
</script>

<style scoped>
.question-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Badges */
.badges-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 12px;
  line-height: 1.2;
}

.badge-category {
  background: var(--accent-purple-soft);
  color: var(--accent-purple);
}

.badge-type {
  background: var(--accent-blue-soft);
  color: var(--accent-blue);
}

/* Question text block */
.question-text-block {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
}

.question-text-content {
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
}

/* Answer section (for text type questions) */
.answer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.correct-answer-box {
  padding: 12px;
  background-color: var(--accent-green-soft);
  border: 1px solid var(--accent-green);
  border-radius: 12px;
}

.answer-text {
  color: var(--text-primary);
}

.section-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

/* Options section */
.options-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.multiple-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  transition: background-color 0.15s ease;
}

.option-item.option-correct {
  background-color: var(--accent-green-soft);
  border: 1px solid var(--accent-green);
}

.option-number {
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  color: var(--text-primary);
  word-break: break-word;
}

.option-badge {
  color: var(--accent-green);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

/* Metadata */
.metadata {
  padding-top: 16px;
  border-top: 1px solid var(--divider);
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
