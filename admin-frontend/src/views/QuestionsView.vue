<template>
  <div class="questions-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-buttons">
        <Button icon="folder" variant="secondary" @click="showCategoryModal = true">
          <span class="hide-mobile">Категории</span>
        </Button>
        <Button icon="plus" @click="goToCreate">
          <span class="hide-mobile">Добавить вопрос</span>
          <span class="show-mobile">Добавить</span>
        </Button>
      </div>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по тексту вопроса..." @input="loadQuestions" />

        <Select v-model="filters.category" :options="categoryOptions" placeholder="Все категории" @change="loadQuestions" />

        <Select v-model="filters.type" :options="typeOptions" placeholder="Все типы" @change="loadQuestions" />

        <Button variant="secondary" @click="resetFilters" fullWidth icon="refresh-ccw">Сбросить</Button>
      </div>

      <!-- Переключатель группировки -->
      <div class="grouping-toggle">
        <label class="toggle-checkbox">
          <input type="checkbox" v-model="groupByAssessment" @change="loadQuestions" />
          <span>Группировать по аттестациям</span>
        </label>
      </div>
    </Card>

    <!-- Список вопросов -->
    <Preloader v-if="loading" />
    <Card v-else padding="none" class="questions-card">
      <div v-if="questions.length === 0" class="empty-state">Вопросы не найдены</div>

      <div v-else class="table-wrapper hide-mobile">
        <table class="questions-table">
          <thead>
            <tr>
              <th>Вопрос</th>
              <th>Категория</th>
              <th>Тип</th>
              <th>Вариантов</th>
              <th>Автор</th>
              <th>Дата создания</th>
              <th class="actions-col">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="question in questions" :key="question.id">
              <td class="question-cell">
                <div class="question-text">{{ question.question_text }}</div>
              </td>
              <td>
                <Badge variant="default" size="sm" rounded>
                  {{ question.category_name || "Без категории" }}
                </Badge>
              </td>
              <td>
                <Badge variant="secondary" size="sm" rounded>
                  {{ getQuestionTypeLabel(question.question_type) }}
                </Badge>
              </td>
              <td>{{ question.question_type === "text" ? "—" : question.options_count }}</td>
              <td>{{ question.first_name }} {{ question.last_name }}</td>
              <td class="date-cell">{{ formatDate(question.created_at) }}</td>
              <td class="actions-cell">
                <div class="actions-buttons">
                  <Button @click="goToDetails(question.id)" class="action-btn action-btn-info" title="Просмотр" icon="eye"></Button>
                  <Button @click="goToEdit(question.id)" class="action-btn action-btn-edit" title="Редактировать" icon="pencil"></Button>
                  <Button @click="confirmDelete(question)" class="action-btn action-btn-delete" title="Удалить" icon="trash"></Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="show-mobile mobile-cards">
        <div v-for="question in questions" :key="question.id" class="question-card">
          <div class="question-card-header">
            <h3 class="question-card-title">{{ question.question_text }}</h3>
            <div class="question-card-badges">
              <Badge variant="default" size="sm" rounded>
                {{ question.category_name || "Без категории" }}
              </Badge>
              <Badge variant="secondary" size="sm" rounded>
                {{ getQuestionTypeLabel(question.question_type) }}
              </Badge>
            </div>
          </div>

          <div class="question-card-body">
            <div class="question-card-row">
              <span class="question-card-label">Тип:</span>
              <span class="question-card-value">{{ getQuestionTypeLabel(question.question_type) }}</span>
            </div>
            <div v-if="question.question_type !== 'text'" class="question-card-row">
              <span class="question-card-label">Вариантов:</span>
              <span class="question-card-value">{{ question.options_count }}</span>
            </div>
            <div class="question-card-row">
              <span class="question-card-label">Автор:</span>
              <span class="question-card-value">{{ question.first_name }} {{ question.last_name }}</span>
            </div>
            <div class="question-card-row">
              <span class="question-card-label">Дата создания:</span>
              <span class="question-card-value">{{ formatDate(question.created_at) }}</span>
            </div>
          </div>

          <div class="question-card-actions">
            <Button size="sm" variant="secondary" icon="eye" @click="goToDetails(question.id)" fullWidth>Просмотр</Button>
            <Button size="sm" variant="secondary" icon="pencil" @click="goToEdit(question.id)" fullWidth>Редактировать</Button>
            <Button size="sm" variant="danger" icon="trash" @click="confirmDelete(question)" fullWidth>Удалить</Button>
          </div>
        </div>
      </div>
    </Card>

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
import Badge from "../components/ui/Badge.vue";
import CategoryManager from "../components/CategoryManager.vue";
import { useToast } from "../composables/useToast";

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
const { showToast } = useToast();

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

const buildFiltersPayload = () => {
  const payload = { ...filters.value };
  if (groupByAssessment.value) {
    payload.group_by = "assessment";
  }
  return payload;
};

const loadQuestions = async () => {
  loading.value = true;
  try {
    const data = await getQuestions(buildFiltersPayload());
    questions.value = data.questions;
  } catch (error) {
    console.error("Load questions error:", error);
    showToast("Ошибка загрузки вопросов", "error");
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
      showToast("Вопрос удален", "success");
      loadQuestions();
    } catch (error) {
      console.error("Delete question error:", error);
      showToast("Ошибка удаления вопроса", "error");
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
  justify-content: end;
  gap: 16px;
  margin-bottom: 32px;
}

.page-heading {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 12px;
}

.show-mobile {
  display: none !important;
}

.filters-card {
  margin-bottom: 32px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
}

/* Переключатель группировки */
.grouping-toggle {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

.toggle-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.toggle-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-blue);
}

/* Таблица */
.questions-card {
  margin-bottom: 32px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.questions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.questions-table thead {
  border-bottom: 1px solid var(--divider);
}

.questions-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.questions-table td {
  padding: 16px;
  color: var(--text-primary);
}

.question-cell {
  max-width: 300px;
}

.question-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.date-cell {
  white-space: nowrap;
}

.actions-col {
  text-align: right;
  width: 150px;
}

.actions-cell {
  text-align: right;
}

.actions-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: var(--divider);
  color: var(--text-primary);
}

.action-btn-delete:hover {
  background-color: #d4183d;
  color: white;
}

/* Mobile cards */
.mobile-cards {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.question-card {
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  word-break: break-word;
}

.question-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--divider);
  border-bottom: 1px solid var(--divider);
}

.question-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}

.question-card-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.question-card-value {
  color: var(--text-primary);
  text-align: right;
  flex: 1;
}

.question-card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Empty state */
.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Responsive design */
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

  .questions-table {
    font-size: 13px;
  }

  .questions-table th,
  .questions-table td {
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 20px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .header-buttons {
    flex-direction: column;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .grouping-toggle {
    justify-content: flex-start;
  }
}
</style>
