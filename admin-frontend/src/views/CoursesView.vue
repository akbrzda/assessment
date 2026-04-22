<template>
  <div class="courses-view">
    <div class="page-header">
      <Button icon="plus" @click="goToCreate">Создать курс</Button>
    </div>

    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по названию или описанию" @keyup.enter="loadCourses" />
        <Select v-model="filters.status" :options="statusFilterOptions" placeholder="Все статусы" @update:modelValue="loadCourses" />
        <Button variant="secondary" icon="search" @click="loadCourses">Найти</Button>
        <Button variant="secondary" icon="refresh-ccw" @click="resetFilters">Сбросить</Button>
      </div>
    </Card>

    <Card padding="none" class="courses-card">
      <Preloader v-if="loading" />

      <div v-else-if="courses.length === 0" class="empty-state">
        <p>Курсы не найдены</p>
      </div>

      <div v-else>
        <div class="table-wrapper hide-mobile">
          <table class="courses-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                <th>Тем курса</th>
                <th>Версия</th>
                <th>Обновлен</th>
                <th class="actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="course in courses" :key="course.id">
                <td>
                  <div class="course-title">{{ course.title }}</div>
                  <div class="course-desc">{{ course.description || "Без описания" }}</div>
                </td>
                <td>
                  <Badge :variant="getStatusVariant(course.status)" rounded size="sm">
                    {{ getStatusLabel(course.status) }}
                  </Badge>
                </td>
                <td>{{ course.sectionsCount }}</td>
                <td>{{ course.version }}</td>
                <td>{{ formatDate(course.updatedAt) }}</td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <Button size="sm" variant="secondary" icon="pencil" @click="goToEdit(course.id)">Изменить</Button>
                    <Button v-if="course.status === 'draft'" size="sm" variant="success" icon="send" @click="handlePublish(course)">
                      Опубликовать
                    </Button>
                    <Button v-if="course.status === 'published'" size="sm" variant="secondary" icon="archive" @click="handleArchive(course)">
                      Закрыть
                    </Button>
                    <Button v-if="course.status !== 'published'" size="sm" variant="danger" icon="trash" @click="handleDelete(course)">
                      Удалить
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-cards show-mobile">
          <div v-for="course in courses" :key="course.id" class="course-card">
            <div class="course-card-header">
              <div>
                <h3 class="course-card-title">{{ course.title }}</h3>
                <p class="course-card-desc">{{ course.description || "Без описания" }}</p>
              </div>
              <Badge :variant="getStatusVariant(course.status)" rounded size="sm">
                {{ getStatusLabel(course.status) }}
              </Badge>
            </div>

            <div class="course-card-grid">
              <div class="course-card-row">
                <span>Тем курса:</span><strong>{{ course.sectionsCount }}</strong>
              </div>
              <div class="course-card-row">
                <span>Версия:</span><strong>{{ course.version }}</strong>
              </div>
              <div class="course-card-row">
                <span>Обновлен:</span><strong>{{ formatDate(course.updatedAt) }}</strong>
              </div>
            </div>

            <div class="course-card-actions">
              <Button size="sm" variant="secondary" icon="pencil" @click="goToEdit(course.id)" fullWidth>Изменить</Button>
              <Button v-if="course.status === 'draft'" size="sm" variant="success" icon="send" @click="handlePublish(course)" fullWidth>
                Опубликовать
              </Button>
              <Button v-if="course.status === 'published'" size="sm" variant="secondary" icon="archive" @click="handleArchive(course)" fullWidth>
                Закрыть
              </Button>
              <Button v-if="course.status !== 'published'" size="sm" variant="danger" icon="trash" @click="handleDelete(course)" fullWidth>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Аналитика: воронка курсов -->
    <Card v-if="funnel.length > 0" class="funnel-card">
      <div class="funnel-header">
        <h2>Воронка по курсам</h2>
        <p>Назначения, прогресс и суммарное время прохождения по каждому опубликованному курсу.</p>
      </div>
      <div class="table-wrapper">
        <table class="courses-table">
          <thead>
            <tr>
              <th>Курс</th>
              <th>Назначено</th>
              <th>Начали</th>
              <th>Проходят</th>
              <th>Завершили</th>
              <th>Попытки (темы)</th>
              <th>Попытки (итог)</th>
              <th>Время в курсе</th>
              <th>Ср. балл курса</th>
              <th>Ср. балл итога</th>
              <th>Ср. прогресс</th>
              <th>Конверсия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in funnel" :key="row.courseId">
              <td>
                <span class="course-title">{{ row.courseTitle }}</span>
              </td>
              <td>{{ row.assignedCount }}</td>
              <td>{{ row.startedCount }}</td>
              <td>{{ row.inProgressCount }}</td>
              <td>{{ row.completedCount }}</td>
              <td>{{ row.sectionTestsAttemptsCount }}</td>
              <td>{{ row.finalAssessmentAttemptsCount }}</td>
              <td>{{ formatDuration(row.totalTimeSpentSeconds) }}</td>
              <td>{{ row.avgCourseScore }}%</td>
              <td>{{ row.avgFinalScore }}%</td>
              <td>{{ row.avgProgress }}%</td>
              <td>
                <span class="funnel-conv"> {{ row.assignedCount > 0 ? Math.round((row.completedCount / row.assignedCount) * 100) : 0 }}% </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Badge, Button, Card, Input, Preloader, Select } from "../components/ui";
import { archiveCourse, deleteCourse, getCourses, publishCourse, getCourseAnalyticsFunnel } from "../api/courses";
import { useToast } from "../composables/useToast";

const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const courses = ref([]);
const funnel = ref([]);
const filters = ref({
  search: "",
  status: "",
});

const statusFilterOptions = [
  { value: "draft", label: "Черновик" },
  { value: "published", label: "Опубликован" },
  { value: "archived", label: "Закрыт" },
];

const getStatusLabel = (status) => {
  const labels = {
    draft: "Черновик",
    published: "Опубликован",
    archived: "Закрыт",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    draft: "warning",
    published: "success",
    archived: "default",
  };
  return variants[status] || "default";
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (secondsValue) => {
  const totalSeconds = Number(secondsValue || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0м";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
};

const getErrorMessage = (error, fallbackText) => {
  return error?.response?.data?.error || fallbackText;
};

const loadCourses = async () => {
  loading.value = true;
  try {
    const response = await getCourses(filters.value);
    courses.value = response.courses || [];
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить курсы"), "error");
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = {
    search: "",
    status: "",
  };
  loadCourses();
};

const goToCreate = () => {
  router.push("/courses/create");
};

const goToEdit = (id) => {
  router.push(`/courses/${id}/edit`);
};

const handlePublish = async (course) => {
  if (!window.confirm(`Опубликовать курс "${course.title}"?`)) {
    return;
  }

  try {
    await publishCourse(course.id);
    showToast("Курс опубликован", "success");
    await loadCourses();
  } catch (error) {
    const validationErrors = error?.response?.data?.validationErrors;
    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      showToast(validationErrors.join("; "), "error", 7000);
      return;
    }
    showToast(getErrorMessage(error, "Не удалось опубликовать курс"), "error");
  }
};

const handleArchive = async (course) => {
  if (!window.confirm(`Закрыть курс "${course.title}" для новых пользователей?`)) {
    return;
  }

  try {
    await archiveCourse(course.id);
    showToast("Курс закрыт", "success");
    await loadCourses();
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось закрыть курс"), "error");
  }
};

const handleDelete = async (course) => {
  if (!window.confirm(`Удалить курс "${course.title}"?`)) {
    return;
  }

  try {
    await deleteCourse(course.id);
    showToast("Курс удален", "success");
    await loadCourses();
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить курс"), "error");
  }
};

onMounted(async () => {
  await loadCourses();
  try {
    const response = await getCourseAnalyticsFunnel();
    funnel.value = response.courses || [];
  } catch {
    // Воронка — не критичная функция, ошибку не показываем
  }
});
</script>

<style scoped>
.courses-view {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.filters-card {
  margin-bottom: 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr auto auto;
  gap: 8px;
}

.table-wrapper {
  overflow-x: auto;
}

.courses-table {
  width: 100%;
  border-collapse: collapse;
}

.courses-table thead {
  border-bottom: 1px solid var(--divider);
}

.courses-table th,
.courses-table td {
  padding: 14px 16px;
  text-align: left;
}

.courses-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.courses-table tbody tr {
  border-bottom: 1px solid var(--divider);
}

.course-title {
  font-weight: 600;
}

.course-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.actions-cell {
  text-align: right;
}

.actions-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.empty-state {
  padding: 64px 32px;
  text-align: center;
  color: var(--text-secondary);
}

.show-mobile {
  display: none;
}

.mobile-cards {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 14px;
  background: var(--bg-secondary);
}

.course-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.course-card-title {
  margin: 0;
  font-size: 16px;
}

.course-card-desc {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.course-card-grid {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.course-card-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary);
}

.course-card-row strong {
  color: var(--text-primary);
  text-align: right;
}

.course-card-actions {
  display: grid;
  gap: 8px;
}

@media (max-width: 1024px) {
  .hide-mobile {
    display: none !important;
  }

  .show-mobile {
    display: block !important;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.funnel-card {
  margin-top: 24px;
}

.funnel-header {
  margin-bottom: 16px;
}

.funnel-header h2 {
  margin: 0 0 4px;
}

.funnel-header p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.funnel-conv {
  font-weight: 600;
  color: var(--primary, #6366f1);
}
</style>
