<template>
  <div>
    <Preloader v-if="loading" />
    <form v-else @submit.prevent="handleSubmit" class="form-container">
      <!-- Категория -->
      <Select v-model="form.categoryId" label="Категория" :options="categoryOptions" />

      <!-- Тип вопроса -->
      <div class="form-group">
        <label class="form-label">Тип вопроса</label>
        <div class="radio-group">
          <label v-for="option in questionTypeOptions" :key="option.value" class="radio-label">
            <input type="radio" :value="option.value" v-model="form.questionType" />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>
      <p class="form-hint">
        <template v-if="form.questionType === 'single'">Один правильный вариант из списка</template>
        <template v-else-if="form.questionType === 'multiple'">Несколько правильных вариантов</template>
        <template v-else-if="form.questionType === 'matching'">Сопоставление элементов</template>
        <template v-else>Сотрудник вводит текст, который сравнивается с эталонным</template>
      </p>

      <!-- Текст вопроса -->
      <Textarea v-model="form.questionText" label="Текст вопроса" :rows="3" required placeholder="Введите текст вопроса" />

      <!-- Эталонный ответ для текстового типа -->
      <Textarea
        v-if="form.questionType === 'text'"
        v-model="form.correctTextAnswer"
        label="Эталонный ответ"
        :rows="2"
        required
        placeholder="Введите правильный ответ"
        hint="Ответ сотрудника будет сравниваться с этим текстом"
      />

      <!-- Варианты ответов для single и multiple -->
      <div v-if="form.questionType !== 'text'" class="form-group">
        <div class="options-header">
          <label class="form-label">Варианты ответов (2-6)</label>
          <Button @click="addOption" :disabled="form.options.length >= 6" variant="secondary" size="sm">+ Добавить вариант</Button>
        </div>

        <div class="options-list">
          <div v-for="(option, index) in form.options" :key="index" class="option-row">
            <template v-if="form.questionType === 'matching'">
              <Input v-model="option.text" type="text" placeholder="Левая колонка" required />
              <Input v-model="option.matchText" type="text" placeholder="Правая колонка" required />
            </template>
            <template v-else>
              <Input v-model="option.text" type="text" placeholder="Текст варианта" required />
              <label class="option-checkbox-label">
                <input v-if="form.questionType === 'multiple'" type="checkbox" v-model="option.isCorrect" />
                <input v-else type="radio" :name="'correct-option'" :checked="option.isCorrect" @change="() => setCorrectOption(index)" />
                <span>Правильный</span>
              </label>
            </template>
            <Button @click="removeOption(index)" :disabled="form.options.length <= 2" variant="danger" size="sm" icon="trash" />
          </div>
        </div>
        <Button @click="addOption" :disabled="form.options.length >= 6" variant="secondary">+ Добавить вариант</Button>

        <p class="form-hint">
          <template v-if="form.questionType === 'single'">Отметьте один правильный ответ</template>
          <template v-else-if="form.questionType === 'multiple'">Отметьте минимум 2 правильных ответа</template>
          <template v-else>Заполните все пары</template>
        </p>
      </div>

      <!-- Кнопки -->
      <div class="form-actions">
        <Button @click="$emit('cancel')" variant="secondary">Отмена</Button>
        <Button type="submit" :disabled="!isFormValid" variant="primary">
          {{ questionId ? "Сохранить" : "Создать" }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { getQuestionById, createQuestion, updateQuestion } from "../api/questionBank";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Select from "./ui/Select.vue";
import Button from "./ui/Button.vue";
import Textarea from "./ui/Textarea.vue";
import { useToast } from "../composables/useToast";

const props = defineProps({
  questionId: {
    type: Number,
    default: null,
  },
  categories: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const loading = ref(false);
const { showToast } = useToast();

const form = ref({
  categoryId: null,
  questionType: "single",
  questionText: "",
  correctTextAnswer: "",
  options: [
    { text: "", matchText: "", isCorrect: true },
    { text: "", matchText: "", isCorrect: false },
  ],
});
const typeCache = ref({
  text: { correctTextAnswer: "" },
  single: { options: [] },
  multiple: { options: [] },
  matching: { options: [] },
});

const isFormValid = computed(() => {
  if (!form.value.questionText) return false;

  if (form.value.questionType === "text") {
    return form.value.correctTextAnswer.trim().length > 0;
  }

  if (form.value.options.length < 2 || form.value.options.length > 6) return false;

  // Проверить, что все варианты заполнены
  const allFilled =
    form.value.questionType === "matching"
      ? form.value.options.every((opt) => opt.text.trim().length > 0 && opt.matchText && opt.matchText.trim().length > 0)
      : form.value.options.every((opt) => opt.text.trim().length > 0);
  if (!allFilled) return false;

  // Проверить правильные ответы
  const correctCount = form.value.options.filter((opt) => opt.isCorrect).length;

  if (form.value.questionType === "single") {
    return correctCount === 1;
  } else if (form.value.questionType === "multiple") {
    return correctCount >= 2;
  }

  return form.value.questionType === "matching";
});

const categoryOptions = computed(() => [
  { value: null, label: "Без категории" },
  ...props.categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  })),
]);

const questionTypeOptions = [
  { value: "single", label: "Одиночный" },
  { value: "multiple", label: "Множественный" },
  { value: "text", label: "Эталонный ответ" },
  { value: "matching", label: "Сопоставление" },
];

// При смене типа вопроса сбрасываем данные
watch(
  () => form.value.questionType,
  (newType, oldType) => {
    if (oldType === "text") {
      typeCache.value.text.correctTextAnswer = form.value.correctTextAnswer || "";
    } else {
      typeCache.value[oldType] = {
        options: (form.value.options || []).map((opt) => ({
          text: opt.text || "",
          matchText: opt.matchText || "",
          isCorrect: Boolean(opt.isCorrect),
        })),
      };
    }

    if (newType === "text") {
      form.value.correctTextAnswer = typeCache.value.text.correctTextAnswer || "";
      form.value.options = [];
    } else if (oldType === "text") {
      form.value.correctTextAnswer = "";
      const cachedOptions = typeCache.value[newType]?.options;
      form.value.options =
        cachedOptions && cachedOptions.length
          ? cachedOptions.map((opt) => ({ ...opt }))
          : [
              { text: "", matchText: "", isCorrect: true },
              { text: "", matchText: "", isCorrect: false },
            ];
    } else if (newType === "matching") {
      const cachedOptions = typeCache.value.matching?.options;
      form.value.options =
        cachedOptions && cachedOptions.length
          ? cachedOptions.map((opt) => ({ ...opt, isCorrect: false }))
          : form.value.options.map((opt) => ({
              text: opt.text || "",
              matchText: opt.matchText || "",
              isCorrect: false,
            }));
    } else if (newType === "single") {
      const cachedOptions = typeCache.value.single?.options;
      if (cachedOptions && cachedOptions.length) {
        form.value.options = cachedOptions.map((opt) => ({ ...opt }));
      }
      // При переключении на single оставляем только один правильный
      let foundCorrect = false;
      form.value.options.forEach((opt) => {
        if (opt.isCorrect && !foundCorrect) {
          foundCorrect = true;
        } else {
          opt.isCorrect = false;
        }
      });
      if (!foundCorrect && form.value.options.length > 0) {
        form.value.options[0].isCorrect = true;
      }
    } else if (newType === "multiple") {
      const cachedOptions = typeCache.value.multiple?.options;
      if (cachedOptions && cachedOptions.length) {
        form.value.options = cachedOptions.map((opt) => ({ ...opt }));
      }
    }
  }
);

const loadQuestion = async () => {
  if (!props.questionId) return;

  loading.value = true;
  try {
    const data = await getQuestionById(props.questionId);
    const question = data.question;

    form.value = {
      categoryId: question.category_id,
      questionType: question.question_type || "single",
      questionText: question.question_text,
      correctTextAnswer: question.correct_text_answer || "",
      options: question.options
        ? question.options.map((opt) => ({
            text: opt.option_text,
            matchText: opt.match_text || "",
            isCorrect: opt.is_correct === 1,
          }))
        : [],
    };
    if (form.value.questionType === "text") {
      typeCache.value.text.correctTextAnswer = form.value.correctTextAnswer || "";
    } else {
      typeCache.value[form.value.questionType] = {
        options: (form.value.options || []).map((opt) => ({
          text: opt.text || "",
          matchText: opt.matchText || "",
          isCorrect: Boolean(opt.isCorrect),
        })),
      };
    }
  } catch (error) {
    console.error("Load question error:", error);
    showToast("Ошибка загрузки вопроса", "error");
  } finally {
    loading.value = false;
  }
};

const addOption = () => {
  if (form.value.options.length < 6) {
    form.value.options.push({
      text: "",
      matchText: "",
      isCorrect: false,
    });
  }
};

const removeOption = (index) => {
  if (form.value.options.length > 2) {
    form.value.options.splice(index, 1);
  }
};

const setCorrectOption = (index) => {
  form.value.options.forEach((opt, idx) => {
    opt.isCorrect = idx === index;
  });
};

const handleSubmit = async () => {
  if (!isFormValid.value) {
    if (form.value.questionType === "text") {
      showToast("Пожалуйста, заполните текст вопроса и эталонный ответ", "warning");
    } else if (form.value.questionType === "single") {
      showToast("Пожалуйста, заполните все поля и отметьте один правильный ответ", "warning");
    } else if (form.value.questionType === "matching") {
      showToast("Пожалуйста, заполните все пары", "warning");
    } else {
      showToast("Пожалуйста, заполните все поля и отметьте минимум 2 правильных ответа", "warning");
    }
    return;
  }

  loading.value = true;
  try {
    if (props.questionId) {
      await updateQuestion(props.questionId, form.value);
      showToast("Вопрос обновлен", "success");
    } else {
      await createQuestion(form.value);
      showToast("Вопрос создан", "success");
    }
    emit("submit");
  } catch (error) {
    console.error("Save question error:", error);
    showToast(error.response?.data?.error || "Ошибка сохранения вопроса", "error");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.questionId) {
    loadQuestion();
  }
});
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

/* Options section */
.options-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
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

.option-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Form actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

@media (max-width: 768px) {
  .options-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .option-row {
    flex-wrap: wrap;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>
