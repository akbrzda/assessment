<template>
  <div class="questions-view">
    <PageHeader title="Банк вопросов">
      <template #actions>
        <Button variant="secondary" icon="folder" @click="showCategoryModal = true">
          <span class="hidden sm:inline">Категории</span>
        </Button>
        <Button icon="plus" @click="goToCreate">
          <span class="hidden sm:inline">Добавить вопрос</span>
          <span class="sm:hidden">Добавить</span>
        </Button>
      </template>
    </PageHeader>

    <FilterBar
      v-model="filters"
      search-key="search"
      search-placeholder="Поиск по тексту вопроса..."
      :filter-defs="filterDefs"
      class="mb-4"
      @change="applyFilters"
    />

    <div class="flex items-center justify-end mb-6">
      <label class="flex items-center gap-2 cursor-pointer text-sm text-foreground select-none">
        <input type="checkbox" v-model="groupByAssessment" class="w-4 h-4 accent-primary" @change="applyFilters" />
        Группировать по аттестациям
      </label>
    </div>

    <DataTable
      :loading="skeletonVisible"
      :loading-rows="8"
      :total="totalQuestions"
      :page="pagination.page"
      :limit="pagination.limit"
      :is-empty="questions.length === 0"
      :empty-type="hasActiveFilters ? 'filter' : 'first-time'"
      empty-title="Вопросы не найдены"
      @update:page="changePage($event)"
      @update:limit="
        pagination.limit = $event;
        pagination.page = 1;
        loadQuestions();
      "
    >
      <template #head>
        <TableHead>Вопрос</TableHead>
        <TableHead>Категория</TableHead>
        <TableHead>Тип</TableHead>
        <TableHead>Вариантов</TableHead>
        <TableHead>Автор</TableHead>
        <TableHead>Дата создания</TableHead>
        <TableHead right>Действия</TableHead>
      </template>

      <template #body>
        <TableRow v-for="question in questions" :key="question.id">
          <TableCell>
            <div class="max-w-[300px] line-clamp-2">{{ question.question_text }}</div>
          </TableCell>
          <TableCell>
            <Badge variant="default" size="sm">{{ question.category_name || "Без категории" }}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" size="sm">{{ getQuestionTypeLabel(question.question_type) }}</Badge>
          </TableCell>
          <TableCell muted>{{ question.question_type === "text" ? "—" : question.options_count }}</TableCell>
          <TableCell muted>{{ question.first_name }} {{ question.last_name }}</TableCell>
          <TableCell muted>{{ formatDate(question.created_at) }}</TableCell>
          <TableCell right>
            <div class="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" :icon-only="true" icon="eye" title="Просмотр" @click="goToDetails(question.id)" />
              <Button variant="ghost" size="sm" :icon-only="true" icon="pencil" title="Редактировать" @click="goToEdit(question.id)" />
              <Button variant="ghost" size="sm" :icon-only="true" icon="trash" title="Удалить" @click="confirmDelete(question)" />
            </div>
          </TableCell>
        </TableRow>
      </template>

      <template #mobile>
        <div v-for="question in questions" :key="question.id" class="p-4 space-y-3">
          <div>
            <h3 class="font-semibold text-foreground break-words">{{ question.question_text }}</h3>
            <div class="flex flex-wrap gap-2 mt-2">
              <Badge variant="default" size="sm">{{ question.category_name || "Без категории" }}</Badge>
              <Badge variant="secondary" size="sm">{{ getQuestionTypeLabel(question.question_type) }}</Badge>
            </div>
          </div>
          <dl class="grid gap-2 text-sm border-t border-border pt-3">
            <div v-if="question.question_type !== 'text'" class="flex justify-between">
              <dt class="text-muted-foreground">Вариантов</dt>
              <dd class="font-medium">{{ question.options_count }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Автор</dt>
              <dd class="font-medium">{{ question.first_name }} {{ question.last_name }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Дата создания</dt>
              <dd class="font-medium">{{ formatDate(question.created_at) }}</dd>
            </div>
          </dl>
          <div class="flex gap-2">
            <Button size="sm" variant="secondary" icon="eye" class="flex-1" @click="goToDetails(question.id)">Просмотр</Button>
            <Button size="sm" variant="secondary" icon="pencil" class="flex-1" @click="goToEdit(question.id)">Редактировать</Button>
            <Button size="sm" variant="danger" icon="trash" @click="confirmDelete(question)" />
          </div>
        </div>
      </template>
    </DataTable>

    <Modal :show="showCategoryModal" title="Управление категориями" size="lg" @close="showCategoryModal = false">
      <CategoryManager @updated="handleCategoryUpdate" />
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { getQuestions, getCategories, deleteQuestion } from "@/api/questionBank";
import { Button, Badge, PageHeader, FilterBar, DataTable, TableHead, TableRow, TableCell, Modal } from "@/components/ui";
import CategoryManager from "@/modules/questions/components/CategoryManager.vue";
import { useToast } from "@/composables/useToast";
import { useSkeletonGate } from "@/composables/useSkeletonGate";

const router = useRouter();
const loading = ref(false);
const { skeletonVisible } = useSkeletonGate(loading, { minDuration: 360, delay: 90 });
const questions = ref([]);
const categories = ref([]);
const totalQuestions = ref(0);
const groupByAssessment = ref(false);
const pagination = ref({
  page: 1,
  limit: 20,
});
const filters = ref({
  search: "",
  category: "",
  type: "",
});
const { showToast } = useToast();

const showCategoryModal = ref(false);

const categoryOptions = computed(() => [
  ...categories.value.map((cat) => ({
    value: cat.id,
    label: `${cat.name} (${cat.questions_count})`,
  })),
]);

const typeOptions = [
  { value: "single", label: "Одиночный" },
  { value: "multiple", label: "Множественный" },
  { value: "text", label: "Эталонный ответ" },
  { value: "matching", label: "Сопоставление" },
];

const totalPages = computed(() => Math.max(1, Math.ceil(totalQuestions.value / pagination.value.limit)));

const hasActiveFilters = computed(() => !!(filters.value.search || filters.value.category || filters.value.type));

const filterDefs = computed(() => [
  { key: "category", label: "Категория", options: categoryOptions.value, placeholder: "Все категории" },
  { key: "type", label: "Тип", options: typeOptions, placeholder: "Все типы" },
]);

const getQuestionTypeLabel = (type) => {
  const option = typeOptions.find((opt) => opt.value === type);
  return option ? option.label : type;
};

const buildFiltersPayload = () => {
  const payload = {
    ...filters.value,
    page: pagination.value.page,
    limit: pagination.value.limit,
  };
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
    totalQuestions.value = Number(data.total || data.questions?.length || 0);
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

const applyFilters = () => {
  pagination.value.page = 1;
  loadQuestions();
};

const changePage = (page) => {
  pagination.value.page = page;
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
  pagination.value.page = 1;
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
</style>
