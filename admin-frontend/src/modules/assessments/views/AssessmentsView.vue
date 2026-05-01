<template>
  <div class="assessments-view">
    <PageHeader title="Аттестации">
      <template #actions>
        <Button v-if="authStore.isSuperAdmin || authStore.isManager" icon="plus" @click="goToCreate">
          <span class="hidden sm:inline">Создать аттестацию</span>
          <span class="sm:hidden">Создать</span>
        </Button>
      </template>
    </PageHeader>

    <FilterBar
      v-model="filters"
      search-key="search"
      search-placeholder="Поиск по названию..."
      :filter-defs="filterDefs"
      class="mb-6"
      @change="onFilterChange"
    />

    <DataTable
      :total="totalAssessments"
      :page="pagination.page"
      :limit="pagination.perPage"
      :is-empty="assessments.length === 0"
      :empty-type="hasActiveFilters ? 'filter' : 'first-time'"
      empty-title="Аттестации не найдены"
      :empty-description="hasActiveFilters ? 'Попробуйте изменить фильтры поиска' : 'Создайте первую аттестацию, чтобы начать оценку сотрудников'"
      :empty-button-text="hasActiveFilters ? '' : 'Создать аттестацию'"
      @update:page="
        pagination.page = $event;
        loadAssessments();
      "
      @update:limit="
        pagination.perPage = $event;
        pagination.page = 1;
        loadAssessments();
      "
      @empty-action="$router.push('/assessments/create')"
    >
      <template #head>
        <TableHead>Название</TableHead>
        <TableHead>Статус</TableHead>
        <TableHead>Открытие</TableHead>
        <TableHead>Закрытие</TableHead>
        <TableHead>Назначено</TableHead>
        <TableHead>Завершено / Назначено</TableHead>
        <TableHead>Средний балл</TableHead>
        <TableHead right>Действия</TableHead>
      </template>

      <template #body>
        <TableRow v-for="assessment in assessments" :key="assessment.id">
          <TableCell>
            <div class="font-semibold text-foreground">{{ assessment.title }}</div>
            <div class="text-sm text-muted-foreground truncate max-w-[280px]">{{ assessment.description || "Нет описания" }}</div>
          </TableCell>
          <TableCell>
            <Badge :variant="getStatusVariant(assessment.status)" size="sm">
              {{ getStatusLabel(assessment.status) }}
            </Badge>
          </TableCell>
          <TableCell muted>{{ formatDate(assessment.open_at) }}</TableCell>
          <TableCell muted>{{ formatDate(assessment.close_at) }}</TableCell>
          <TableCell>{{ assessment.assigned_users }} чел.</TableCell>
          <TableCell>
            <span :class="completionRateClass(assessment)">
              {{ assessment.completed_attempts }} / {{ assessment.assigned_users }}
              <span v-if="assessment.assigned_users > 0" class="text-muted-foreground text-xs">
                ({{ Math.round((assessment.completed_attempts / assessment.assigned_users) * 100) }}%)
              </span>
            </span>
          </TableCell>
          <TableCell emphasized>{{ formatAvgScore(assessment.avg_score) }}</TableCell>
          <TableCell right>
            <div class="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" :icon-only="true" icon="chart-column" title="Детали" @click="goToDetails(assessment.id)" />
              <Button
                v-if="canEditAssessment(assessment)"
                variant="ghost"
                size="sm"
                :icon-only="true"
                icon="pencil"
                title="Редактировать"
                @click="goToEdit(assessment.id)"
              />
              <Button
                v-if="assessment.status === 'pending'"
                variant="ghost"
                size="sm"
                :icon-only="true"
                icon="trash"
                title="Удалить"
                @click="confirmDelete(assessment)"
              />
            </div>
          </TableCell>
        </TableRow>
      </template>

      <template #mobile>
        <div v-for="assessment in assessments" :key="assessment.id" class="p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="font-semibold text-foreground">{{ assessment.title }}</h3>
              <p class="text-sm text-muted-foreground mt-0.5 line-clamp-2">{{ assessment.description || "Нет описания" }}</p>
            </div>
            <Badge :variant="getStatusVariant(assessment.status)" size="sm" class="shrink-0">{{ getStatusLabel(assessment.status) }}</Badge>
          </div>
          <dl class="grid gap-2 text-sm border-t border-border pt-3">
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Открытие</dt>
              <dd class="font-medium">{{ formatDate(assessment.open_at) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Закрытие</dt>
              <dd class="font-medium">{{ formatDate(assessment.close_at) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Назначено</dt>
              <dd class="font-medium">{{ assessment.assigned_users }} чел.</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Завершено</dt>
              <dd class="font-medium">
                {{ assessment.completed_attempts }} / {{ assessment.assigned_users
                }}<span v-if="assessment.assigned_users > 0" class="text-muted-foreground text-xs">
                  ({{ Math.round((assessment.completed_attempts / assessment.assigned_users) * 100) }}%)</span
                >
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Средний балл</dt>
              <dd class="font-semibold text-accent-blue">{{ formatAvgScore(assessment.avg_score) }}</dd>
            </div>
          </dl>
          <div class="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" icon="chart-column" class="flex-1" @click="goToDetails(assessment.id)">Детали</Button>
            <Button v-if="canEditAssessment(assessment)" size="sm" variant="primary" icon="pencil" class="flex-1" @click="goToEdit(assessment.id)"
              >Изменить</Button
            >
            <Button v-if="canEditAssessment(assessment)" size="sm" variant="secondary" icon="book-open-check" @click="goToTheory(assessment.id)" />
            <Button v-if="assessment.status === 'pending'" size="sm" variant="danger" icon="trash" @click="confirmDelete(assessment)" />
          </div>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getAssessments, deleteAssessment } from "@/api/assessments";
import { Button, Badge, PageHeader, FilterBar, DataTable, TableHead, TableRow, TableCell } from "@/components/ui";
import { useToast } from "@/composables/useToast";
import { formatBranchLabel } from "@/utils/branch";

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const assessments = ref([]);
const totalAssessments = ref(0);
const pagination = ref({
  page: 1,
  perPage: 20,
});
const filters = ref({
  search: "",
  status: "",
  branch: "",
});
const { showToast } = useToast();
const totalPages = computed(() => Math.max(1, Math.ceil(totalAssessments.value / pagination.value.perPage)));

const references = ref({
  branches: [],
});

const statusOptions = computed(() => [
  { value: "pending", label: "Ожидает" },
  { value: "open", label: "Открыта" },
  { value: "closed", label: "Закрыта" },
]);

const branchOptions = computed(() => [
  ...references.value.branches.map((branch) => ({
    value: String(branch.id),
    label: formatBranchLabel(branch),
  })),
]);

const hasActiveFilters = computed(() => !!(filters.value.search || filters.value.status || filters.value.branch));

const filterDefs = computed(() => [
  { key: "status", label: "Статус", options: statusOptions.value, placeholder: "Все статусы" },
  { key: "branch", label: "Филиал", options: branchOptions.value, placeholder: "Все филиалы" },
]);

const onFilterChange = () => {
  pagination.value.page = 1;
  loadAssessments();
};

const completionRateClass = (assessment) => {
  if (!assessment.assigned_users) return "";
  const rate = assessment.completed_attempts / assessment.assigned_users;
  if (rate >= 0.8) return "completion-high";
  if (rate >= 0.4) return "completion-mid";
  return "completion-low";
};

const loadReferences = async () => {
  try {
    const { getReferences } = await import("@/api/users");
    const data = await getReferences();
    references.value.branches = data.branches || [];
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadAssessments = async () => {
  loading.value = true;
  try {
    const data = await getAssessments({
      ...filters.value,
      page: pagination.value.page,
      limit: pagination.value.perPage,
    });
    assessments.value = data.assessments || [];
    totalAssessments.value = Number(data.total || 0);
  } catch (error) {
    console.error("Load assessments error:", error);
    showToast("Ошибка загрузки аттестаций", "error");
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = { search: "", status: "", branch: "" };
  pagination.value.page = 1;
  loadAssessments();
};

const goToCreate = () => {
  router.push("/assessments/create");
};

const goToDetails = (id) => {
  router.push(`/assessments/${id}`);
};

const goToEdit = (id) => {
  router.push(`/assessments/${id}/edit`);
};

const goToTheory = (id) => {
  router.push(`/assessments/${id}/theory`);
};

const canEditAssessment = (assessment) => true; // Можно редактировать в любом статусе (вопросы и теорию)

const confirmDelete = async (assessment) => {
  if (confirm(`Вы уверены, что хотите удалить аттестацию "${assessment.title}"?`)) {
    try {
      await deleteAssessment(assessment.id);
      showToast("Аттестация удалена", "success");
      loadAssessments();
    } catch (error) {
      console.error("Delete assessment error:", error);
      showToast("Ошибка удаления аттестации", "error");
    }
  }
};

const getStatusLabel = (status) => {
  const labels = {
    pending: "Ожидает",
    open: "Открыта",
    closed: "Закрыта",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    pending: "warning",
    open: "success",
    closed: "default",
  };
  return variants[status] || "default";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAvgScore = (score) => {
  if (score === null || score === undefined || score === "") {
    return "—";
  }
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) {
    return "—";
  }
  return `${numericScore.toFixed(1)}%`;
};

onMounted(() => {
  loadReferences();
  loadAssessments();
});
</script>

<style scoped>
.assessments-view {
  width: 100%;
}

.completion-high {
  color: hsl(var(--accent-green));
}
.completion-mid {
  color: hsl(var(--accent-orange));
}
.completion-low {
  color: hsl(var(--destructive));
}
</style>
