<template>
  <div class="questions-view">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-heading">Банк вопросов</h2>
      <div class="header-buttons">
        <Button icon="📁" variant="secondary" @click="showCategoryModal = true">
          <span class="hide-mobile">Категории</span>
        </Button>
        <Button icon="➕" @click="goToCreate">
          <span class="hide-mobile">Добавить вопрос</span>
          <span class="show-mobile">Добавить</span>
        </Button>
      </div>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по тексту вопроса..." icon="🔍" @input="loadQuestions" />

        <Select v-model="filters.category" :options="categoryOptions" placeholder="Все категории" @change="loadQuestions" />

        <Select v-model="filters.type" :options="typeOptions" placeholder="Все типы" @change="loadQuestions" />

        <Button variant="ghost" @click="resetFilters" fullWidth> Сбросить </Button>
      </div>

      <!-- Переключатель группировки -->
      <div class="flex items-center justify-end mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            v-model="groupByAssessment"
            @change="loadQuestions"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Группировать по аттестациям</span>
        </label>
      </div>
    </Card>

    <!-- Список вопросов -->
    <Preloader v-if="loading" />
    <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Вопрос</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Категория</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Тип</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Вариантов</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Автор</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Дата создания</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="question in questions" :key="question.id" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 dark:text-white max-w-md truncate">
                  {{ question.question_text }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="badge badge-category">
                  {{ question.category_name || "Без категории" }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="badge badge-type">
                  {{ getQuestionTypeLabel(question.question_type) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {{ question.question_type === "text" ? "—" : question.options_count }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{{ question.first_name }} {{ question.last_name }}</td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {{ formatDate(question.created_at) }}
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                <button
                  @click="goToDetails(question.id)"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition"
                >
                  Просмотр
                </button>
                <button
                  @click="goToEdit(question.id)"
                  class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                >
                  Редактировать
                </button>
                <button @click="confirmDelete(question)" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition">
                  Удалить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Пустое состояние -->
      <div v-if="!loading && questions.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">Вопросы не найдены</div>
    </div>

    <!-- Модальное окно управления категориями -->
    <Modal :show="showCategoryModal" @close="showCategoryModal = false" title="Управление категориями" size="lg">
      <CategoryManager @updated="handleCategoryUpdate" />
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { getQuestions, getCategories, deleteQuestion } from "../api/questionBank";
import Preloader from "../components/ui/Preloader.vue";
import Modal from "../components/ui/Modal.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import CategoryManager from "../components/CategoryManager.vue";

const router = useRouter();
const loading = ref(false);
const questions = ref([]);
const categories = ref([]);
const groupByAssessment = ref(false);
const filters = ref({
  search: "",
  category: "",
  type: "",
});

const showCategoryModal = ref(false);

const categoryOptions = computed(() => [
  { value: "", label: "Все категории" },
  ...categories.value.map((cat) => ({
    value: cat.id,
    label: `${cat.name} (${cat.questions_count})`,
  })),
]);

const typeOptions = [
  { value: "", label: "Все типы" },
  { value: "single", label: "Один вариант" },
  { value: "multiple", label: "Множественный выбор" },
  { value: "text", label: "Текстовый ответ" },
];

const getQuestionTypeLabel = (type) => {
  const option = typeOptions.find((opt) => opt.value === type);
  return option ? option.label : type;
};

const loadQuestions = async () => {
  loading.value = true;
  try {
    const data = await getQuestions(filters.value);
    questions.value = data.questions;
  } catch (error) {
    console.error("Load questions error:", error);
    alert("Ошибка загрузки вопросов");
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  try {
    const data = await getCategories();
    categories.value = data.categories;
  } catch (error) {
    console.error("Load categories error:", error);
  }
};

const resetFilters = () => {
  filters.value = {
    search: "",
    category: "",
    type: "",
  };
  loadQuestions();
};

const goToCreate = () => {
  router.push("/questions/create");
};

const goToEdit = (id) => {
  router.push(`/questions/${id}/edit`);
};

const goToDetails = (id) => {
  router.push(`/questions/${id}`);
};

const handleCategoryUpdate = () => {
  loadCategories();
  loadQuestions();
};

const confirmDelete = async (question) => {
  if (confirm(`Вы уверены, что хотите удалить этот вопрос?`)) {
    try {
      await deleteQuestion(question.id);
      alert("Вопрос удален");
      loadQuestions();
    } catch (error) {
      console.error("Delete question error:", error);
      alert("Ошибка удаления вопроса");
    }
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

onMounted(async () => {
  await loadCategories();
  await loadQuestions();
});
</script>

<style scoped>
.questions-view {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-heading {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
}

.hide-mobile {
  display: inline;
}

.show-mobile {
  display: none;
}

.filters-card {
  margin-bottom: 2rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 1024px) {
  .hide-mobile {
    display: none !important;
  }

  .show-mobile {
    display: inline !important;
  }

  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 1.5rem;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .header-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.badge-category {
  background: rgba(147, 51, 234, 0.1);
  color: #9333ea;
}

.badge-type {
  background: rgba(0, 136, 204, 0.1);
  color: var(--accent-blue);
}

:global(.dark) .badge-category {
  background: rgba(147, 51, 234, 0.2);
  color: #c084fc;
}

:global(.dark) .badge-type {
  background: rgba(0, 136, 204, 0.2);
  color: #60a5fa;
}
</style>
