<template>
  <div class="course-statistics-view">
    <PageHeader :title="`Статистика курса: ${courseTitle}`" subtitle="Детальная аналитика по сотрудникам">
      <template #actions>
        <Button variant="secondary" icon="arrow-left" @click="goBack">Назад</Button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <Card>
        <div class="metric-title">Назначено</div>
        <div class="metric-value">{{ summary.totalUsers }}</div>
      </Card>
      <Card>
        <div class="metric-title">Завершили</div>
        <div class="metric-value">{{ summary.completedCount }}</div>
      </Card>
      <Card>
        <div class="metric-title">Средний прогресс</div>
        <div class="metric-value">{{ summary.avgProgress }}%</div>
      </Card>
      <Card>
        <div class="metric-title">Средняя оценка</div>
        <div class="metric-value">{{ summary.avgCourseScore }}%</div>
      </Card>
    </div>

    <DataTable :total="users.length" :page="1" :limit="users.length || 1" :is-empty="users.length === 0" empty-type="filter" empty-title="Нет данных по сотрудникам">
      <template #head>
        <TableHead>ФИО</TableHead>
        <TableHead>Логин / ID</TableHead>
        <TableHead>Статус</TableHead>
        <TableHead>Прогресс</TableHead>
        <TableHead>Дата начала</TableHead>
        <TableHead>Дата завершения</TableHead>
        <TableHead>Результат</TableHead>
        <TableHead>Последняя активность</TableHead>
        <TableHead>Пройдено модулей</TableHead>
      </template>

      <template #body>
        <TableRow v-for="user in users" :key="user.userId">
          <TableCell>{{ user.name || "—" }}</TableCell>
          <TableCell>{{ user.login || `ID: ${user.userId}` }}</TableCell>
          <TableCell>
            <Badge :variant="getStatusVariant(user.status)" size="sm">{{ getStatusLabel(user.status) }}</Badge>
          </TableCell>
          <TableCell>{{ user.progressPercent }}%</TableCell>
          <TableCell>{{ formatDate(user.startedAt) }}</TableCell>
          <TableCell>{{ formatDate(user.completedAt) }}</TableCell>
          <TableCell>{{ formatScore(user.avgCourseScore) }}</TableCell>
          <TableCell>{{ formatDate(user.lastActivityAt) }}</TableCell>
          <TableCell>{{ user.completedSections }} / {{ user.totalSections }}</TableCell>
        </TableRow>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Badge, Button, Card, DataTable, PageHeader, TableCell, TableHead, TableRow } from "@/components/ui";
import { getCourseById, getCourseProgressReport } from "@/api/courses";
import { useToast } from "@/composables/useToast";

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const courseId = computed(() => Number(route.params.id));
const course = ref(null);
const users = ref([]);
const summary = ref({
  totalUsers: 0,
  completedCount: 0,
  avgProgress: 0,
  avgCourseScore: 0,
});

const courseTitle = computed(() => String(course.value?.title || "—"));

const goBack = () => {
  router.push("/courses");
};

const normalizeUtcDateInput = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed);
  if (hasTimezone) return trimmed;

  // Бэкенд иногда отдает UTC без суффикса таймзоны, считаем такие значения UTC.
  const normalized = trimmed.replace(" ", "T");
  return `${normalized}Z`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(normalizeUtcDateInput(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return "—";
  return `${score}%`;
};

const getStatusVariant = (status) => {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "closed") return "default";
  return "info";
};

const getStatusLabel = (status) => {
  const labels = {
    not_started: "Не начат",
    in_progress: "В процессе",
    completed: "Завершен",
    closed: "Закрыт",
  };
  return labels[status] || status || "—";
};

const loadData = async () => {
  try {
    const [courseResponse, reportResponse] = await Promise.all([getCourseById(courseId.value), getCourseProgressReport(courseId.value)]);
    course.value = courseResponse.course || null;
    users.value = reportResponse.users || [];
    summary.value = reportResponse.summary || summary.value;
  } catch (error) {
    showToast(error?.response?.data?.error || "Не удалось загрузить статистику курса", "error");
  }
};

onMounted(async () => {
  if (!Number.isInteger(courseId.value) || courseId.value <= 0) {
    showToast("Некорректный идентификатор курса", "error");
    router.push("/courses");
    return;
  }
  await loadData();
});
</script>

<style scoped>
.course-statistics-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric-title {
  color: var(--text-secondary);
  font-size: 13px;
}

.metric-value {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
}
</style>
