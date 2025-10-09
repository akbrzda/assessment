<template>
  <div class="questions-view">
    <div class="questions-header">
      <h1>Управление вопросами</h1>
      <button class="btn btn-primary" @click="showCreateModal = true">
        <PlusIcon class="btn-icon" />
        Добавить вопрос
      </button>
    </div>

    <!-- Поиск и фильтры -->
    <div class="filters-section">
      <div class="search-container">
        <input v-model="searchQuery" type="text" placeholder="Поиск по тексту вопроса..." class="search-input" />
      </div>
      <div class="filters-container">
        <select v-model="branchFilter" class="filter-select">
          <option value="">Все направления</option>
          <option v-for="branch in branches" :key="branch.id" :value="branch.id">
            {{ branch.name }}
          </option>
        </select>
        <select v-model="difficultyFilter" class="filter-select">
          <option value="">Все уровни</option>
          <option value="easy">Легкий</option>
          <option value="medium">Средний</option>
          <option value="hard">Сложный</option>
        </select>
        <select v-model="typeFilter" class="filter-select">
          <option value="">Все типы</option>
          <option value="single">Один ответ</option>
          <option value="multiple">Несколько ответов</option>
          <option value="text">Текстовый ответ</option>
        </select>
      </div>
    </div>

    <!-- Статистика -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">Всего вопросов</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.easy }}</div>
        <div class="stat-label">Легких</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.medium }}</div>
        <div class="stat-label">Средних</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.hard }}</div>
        <div class="stat-label">Сложных</div>
      </div>
    </div>

    <!-- Список вопросов -->
    <div class="questions-list">
      <div v-for="question in filteredQuestions" :key="question.id" class="question-card">
        <div class="question-header">
          <div class="question-meta">
            <span class="branch-badge">{{ getBranchName(question.branchId) }}</span>
            <span class="difficulty-badge" :class="`difficulty-${question.difficulty}`">
              {{ getDifficultyText(question.difficulty) }}
            </span>
            <span class="type-badge">{{ getTypeText(question.type) }}</span>
          </div>
          <div class="question-actions">
            <button class="btn-icon" @click="editQuestion(question)" title="Редактировать">
              <EditIcon />
            </button>
            <button class="btn-icon" @click="duplicateQuestion(question)" title="Дублировать">
              <CopyIcon />
            </button>
            <button class="btn-icon btn-danger" @click="deleteQuestion(question)" title="Удалить">
              <DeleteIcon />
            </button>
          </div>
        </div>
        <div class="question-content">
          <div class="question-text">{{ question.text }}</div>
          <div class="question-options">
            <div v-for="(option, index) in question.options" :key="index" class="option-item">
              <span class="option-letter">{{ String.fromCharCode(65 + index) }}.</span>
              <span class="option-text">{{ option.text }}</span>
              <span v-if="option.isCorrect" class="correct-mark">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Пагинация -->
    <div class="pagination">
      <button class="pagination-btn" :disabled="currentPage === 1" @click="currentPage--">Предыдущая</button>
      <span class="pagination-info"> Страница {{ currentPage }} из {{ totalPages }} </span>
      <button class="pagination-btn" :disabled="currentPage === totalPages" @click="currentPage++">Следующая</button>
    </div>

    <!-- Модальное окно создания/редактирования -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>{{ showEditModal ? "Редактировать" : "Добавить" }} вопрос</h2>
          <button class="modal-close" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveQuestion">
            <div class="form-group">
              <label for="text">Текст вопроса</label>
              <textarea id="text" v-model="questionForm.text" rows="4" required placeholder="Введите текст вопроса"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="branch">Направление</label>
                <select id="branch" v-model="questionForm.branchId" required>
                  <option value="">Выберите направление</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                    {{ branch.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="difficulty">Уровень сложности</label>
                <select id="difficulty" v-model="questionForm.difficulty" required>
                  <option value="easy">Легкий</option>
                  <option value="medium">Средний</option>
                  <option value="hard">Сложный</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="type">Тип вопроса</label>
              <select id="type" v-model="questionForm.type" required>
                <option value="single">Один правильный ответ</option>
                <option value="multiple">Несколько правильных ответов</option>
                <option value="text">Текстовый ответ</option>
              </select>
            </div>

            <div v-if="questionForm.type !== 'text'" class="form-group">
              <label>Варианты ответов</label>
              <div class="options-container">
                <div v-for="(option, index) in questionForm.options" :key="index" class="option-form">
                  <input v-model="option.text" type="text" :placeholder="`Вариант ${String.fromCharCode(65 + index)}`" required />
                  <label class="checkbox-label">
                    <input v-model="option.isCorrect" type="checkbox" />
                    Правильный
                  </label>
                  <button v-if="questionForm.options.length > 2" type="button" class="btn-icon btn-danger" @click="removeOption(index)">
                    <DeleteIcon />
                  </button>
                </div>
              </div>
              <button v-if="questionForm.options.length < 6" type="button" class="btn btn-secondary" @click="addOption">
                <PlusIcon class="btn-icon" />
                Добавить вариант
              </button>
            </div>

            <div v-if="questionForm.type === 'text'" class="form-group">
              <label for="correctAnswer">Правильный ответ</label>
              <input id="correctAnswer" v-model="questionForm.correctAnswer" type="text" placeholder="Введите правильный ответ" required />
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="closeModals">Отмена</button>
              <button type="submit" class="btn btn-primary">
                {{ showEditModal ? "Сохранить" : "Добавить" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "../../stores/user";
import PlusIcon from "../../components/icons/PlusIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";
import DeleteIcon from "../../components/icons/DeleteIcon.vue";
import CopyIcon from "../../components/icons/CopyIcon.vue";

const userStore = useUserStore();

// Реактивные данные
const questions = ref([]);
const searchQuery = ref("");
const branchFilter = ref("");
const difficultyFilter = ref("");
const typeFilter = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;

// Модальные окна
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedQuestion = ref(null);

// Форма вопроса
const questionForm = ref({
  text: "",
  branchId: "",
  difficulty: "medium",
  type: "single",
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  correctAnswer: "",
});

// Направления
const branches = ref([
  { id: 1, name: "Frontend разработка" },
  { id: 2, name: "Backend разработка" },
  { id: 3, name: "Mobile разработка" },
  { id: 4, name: "DevOps" },
  { id: 5, name: "Data Science" },
]);

// Вычисляемые свойства
const stats = computed(() => ({
  total: questions.value.length,
  easy: questions.value.filter((q) => q.difficulty === "easy").length,
  medium: questions.value.filter((q) => q.difficulty === "medium").length,
  hard: questions.value.filter((q) => q.difficulty === "hard").length,
}));

const filteredQuestions = computed(() => {
  let filtered = questions.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((question) => question.text.toLowerCase().includes(query));
  }

  if (branchFilter.value) {
    filtered = filtered.filter((question) => question.branchId == branchFilter.value);
  }

  if (difficultyFilter.value) {
    filtered = filtered.filter((question) => question.difficulty === difficultyFilter.value);
  }

  if (typeFilter.value) {
    filtered = filtered.filter((question) => question.type === typeFilter.value);
  }

  return filtered.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage);
});

const totalPages = computed(() => {
  let filtered = questions.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((question) => question.text.toLowerCase().includes(query));
  }

  if (branchFilter.value) {
    filtered = filtered.filter((question) => question.branchId == branchFilter.value);
  }

  if (difficultyFilter.value) {
    filtered = filtered.filter((question) => question.difficulty === difficultyFilter.value);
  }

  if (typeFilter.value) {
    filtered = filtered.filter((question) => question.type === typeFilter.value);
  }

  return Math.ceil(filtered.length / itemsPerPage);
});

// Методы
const loadQuestions = async () => {
  // Mock данные
  questions.value = [
    {
      id: 1,
      text: "Что такое Virtual DOM в React?",
      branchId: 1,
      difficulty: "medium",
      type: "single",
      options: [
        { text: "Копия реального DOM в памяти", isCorrect: true },
        { text: "Браузерное API для работы с DOM", isCorrect: false },
        { text: "Библиотека для манипуляций с DOM", isCorrect: false },
        { text: "Виртуальная машина JavaScript", isCorrect: false },
      ],
    },
    {
      id: 2,
      text: "Какие HTTP методы являются идемпотентными?",
      branchId: 2,
      difficulty: "hard",
      type: "multiple",
      options: [
        { text: "GET", isCorrect: true },
        { text: "POST", isCorrect: false },
        { text: "PUT", isCorrect: true },
        { text: "DELETE", isCorrect: true },
        { text: "PATCH", isCorrect: false },
      ],
    },
    {
      id: 3,
      text: "Что означает аббревиатура CSS?",
      branchId: 1,
      difficulty: "easy",
      type: "text",
      correctAnswer: "Cascading Style Sheets",
    },
    {
      id: 4,
      text: "Какой порт по умолчанию использует HTTPS?",
      branchId: 2,
      difficulty: "easy",
      type: "single",
      options: [
        { text: "80", isCorrect: false },
        { text: "443", isCorrect: true },
        { text: "8080", isCorrect: false },
        { text: "3000", isCorrect: false },
      ],
    },
  ];
};

const getBranchName = (branchId) => {
  const branch = branches.value.find((b) => b.id === branchId);
  return branch ? branch.name : "Неизвестно";
};

const getDifficultyText = (difficulty) => {
  const difficultyMap = {
    easy: "Легкий",
    medium: "Средний",
    hard: "Сложный",
  };
  return difficultyMap[difficulty] || difficulty;
};

const getTypeText = (type) => {
  const typeMap = {
    single: "Один ответ",
    multiple: "Несколько ответов",
    text: "Текстовый",
  };
  return typeMap[type] || type;
};

const editQuestion = (question) => {
  selectedQuestion.value = question;
  questionForm.value = {
    ...question,
    options: question.options
      ? [...question.options]
      : [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
  };
  showEditModal.value = true;
};

const duplicateQuestion = async (question) => {
  const newQuestion = {
    ...question,
    id: Date.now(),
    text: `${question.text} (копия)`,
  };
  questions.value.unshift(newQuestion);
};

const deleteQuestion = async (question) => {
  if (confirm(`Вы уверены, что хотите удалить этот вопрос?`)) {
    const index = questions.value.findIndex((q) => q.id === question.id);
    if (index !== -1) {
      questions.value.splice(index, 1);
    }
  }
};

const addOption = () => {
  questionForm.value.options.push({ text: "", isCorrect: false });
};

const removeOption = (index) => {
  questionForm.value.options.splice(index, 1);
};

const saveQuestion = async () => {
  if (showEditModal.value) {
    // Обновление существующего вопроса
    const index = questions.value.findIndex((q) => q.id === selectedQuestion.value.id);
    if (index !== -1) {
      questions.value[index] = { ...questionForm.value };
    }
  } else {
    // Создание нового вопроса
    const newQuestion = {
      ...questionForm.value,
      id: Date.now(),
    };
    questions.value.unshift(newQuestion);
  }

  closeModals();
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  selectedQuestion.value = null;
  questionForm.value = {
    text: "",
    branchId: "",
    difficulty: "medium",
    type: "single",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    correctAnswer: "",
  };
};

// Инициализация
onMounted(() => {
  loadQuestions();
});
</script>

<style scoped>
.questions-view {
  padding: 20px;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.questions-header h1 {
  margin: 0;
  color: var(--tg-theme-text-color);
}

.filters-section {
  background: var(--tg-theme-bg-color);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid var(--tg-theme-hint-color);
}

.search-container {
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 8px;
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 16px;
}

.filters-container {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 6px;
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 14px;
  min-width: 160px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.question-card {
  background: var(--tg-theme-bg-color);
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 12px;
  padding: 20px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.question-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.branch-badge {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty-easy {
  background: #e7f5e7;
  color: #2e7d32;
}

.difficulty-medium {
  background: #fff3e0;
  color: #f57c00;
}

.difficulty-hard {
  background: #ffebee;
  color: #c62828;
}

.type-badge {
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.question-actions {
  display: flex;
  gap: 8px;
}

.question-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.question-text {
  font-size: 16px;
  line-height: 1.5;
  color: var(--tg-theme-text-color);
  font-weight: 500;
}

.question-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 6px;
}

.option-letter {
  font-weight: 600;
  color: var(--tg-theme-hint-color);
  min-width: 20px;
}

.option-text {
  flex: 1;
  color: var(--tg-theme-text-color);
}

.correct-mark {
  color: #4caf50;
  font-weight: bold;
  font-size: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.option-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-form input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 6px;
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--tg-theme-text-color);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .questions-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .filters-container {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .question-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .question-meta {
    justify-content: center;
  }

  .question-actions {
    justify-content: center;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .option-form {
    flex-direction: column;
    align-items: stretch;
  }

  .checkbox-label {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .questions-view {
    padding: 15px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .question-card {
    padding: 15px;
  }
}
</style>
