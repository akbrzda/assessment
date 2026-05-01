<template>
  <div class="courses-view" @click="closeMenus">
    <!-- Заголовок страницы -->
    <PageHeader title="Курсы" subtitle="Управляйте курсами, модулями и версиями">
      <template #actions>
        <Button icon="plus" @click.stop="goToCreate">Создать курс</Button>
      </template>
    </PageHeader>

    <!-- Фильтры -->
    <FilterBar
      v-model="filterBarModel"
      search-key="search"
      search-placeholder="Поиск по названию или описанию"
      :filter-defs="courseFilterDefs"
      @change="loadCourses"
    />

    <!-- Переключатель вида -->
    <Tabs v-model="viewMode" :tabs="viewTabsConfig" head-only />

    <!-- Загрузка -->

    <!-- Пустое состояние -->
    <EmptyState v-if="courses.length === 0" type="filter" title="Курсы не найдены" />

    <!-- Карточный режим -->
    <template v-else-if="viewMode === 'cards'">
      <div class="cards-grid">
        <div v-for="(course, index) in paginatedCourses" :key="course.id" class="course-card" @click.stop>
          <!-- Иконка + заголовок + описание -->
          <div class="card-head">
            <div class="course-icon-wrap" :style="{ background: ICON_PALETTES[index % ICON_PALETTES.length].bg }">
              <Icon name="file-text" :size="20" :color="ICON_PALETTES[index % ICON_PALETTES.length].color" />
            </div>
            <div class="card-title-block">
              <h3 class="course-name">{{ course.title }}</h3>
              <p class="course-desc">{{ course.description || "Без описания" }}</p>
            </div>
          </div>

          <!-- Бейдж статуса -->
          <Badge :variant="getStatusVariant(course.status)" size="sm" class="status-badge">
            {{ getStatusLabel(course.status) }}
          </Badge>
          <div v-if="hasUnpublishedChanges(course)" class="draft-warning-chip">Есть несохраненные изменения</div>

          <!-- Статистика -->
          <div class="course-stats">
            <div class="stat-row">
              <Icon name="file-text" :size="14" class="stat-icon" />
              <span class="stat-label">Версия</span>
              <span class="stat-val">{{ course.version }}</span>
            </div>
            <div class="stat-row">
              <Icon name="layers" :size="14" class="stat-icon" />
              <span class="stat-label">Тем курса</span>
              <span class="stat-val">{{ course.sectionsCount }}</span>
            </div>
            <div class="stat-row">
              <Icon name="clock" :size="14" class="stat-icon" />
              <span class="stat-label">Обновлен</span>
              <span class="stat-val">{{ formatDate(course.updatedAt) }}</span>
            </div>
          </div>

          <!-- Футер карточки -->
          <div class="card-footer">
            <button class="card-edit-btn" @click="goToEdit(course.id)">Редактировать</button>
            <div class="menu-wrap" @click.stop>
              <button class="menu-btn" @click="toggleMenu(course.id)">
                <Icon name="more-horizontal" :size="18" />
              </button>
              <div v-if="openMenuId === course.id" class="dropdown-menu">
                <button class="dropdown-item" @click="goToEdit(course.id)"><Icon name="pencil" :size="14" /> Редактировать</button>
                <button
                  v-if="course.status === 'published'"
                  class="dropdown-item"
                  @click="
                    handleArchive(course);
                    openMenuId = null;
                  "
                >
                  <Icon name="archive" :size="14" /> Закрыть
                </button>
                <button
                  v-if="course.status !== 'published'"
                  class="dropdown-item danger"
                  @click="
                    handleDelete(course);
                    openMenuId = null;
                  "
                >
                  <Icon name="trash" :size="14" /> Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Табличный режим -->
    <template v-else>
      <div class="table-container">
        <div class="table-scroll">
          <table class="courses-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                <th>Тем курса</th>
                <th>Версия</th>
                <th>Обновлен</th>
                <th>Автор</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="course in paginatedCourses" :key="course.id">
                <td>
                  <div class="cell-name">{{ course.title }}</div>
                  <div class="cell-desc">{{ course.description || "Без описания" }}</div>
                </td>
                <td>
                  <div class="status-cell-wrap">
                    <Badge :variant="getStatusVariant(course.status)" size="sm">
                      {{ getStatusLabel(course.status) }}
                    </Badge>
                    <div v-if="hasUnpublishedChanges(course)" class="draft-warning-chip draft-warning-chip-table">Есть несохраненные изменения</div>
                  </div>
                </td>
                <td>{{ course.sectionsCount }}</td>
                <td>{{ course.version }}</td>
                <td>{{ formatDate(course.updatedAt) }}</td>
                <td>
                  <div class="author-cell">
                    <div class="author-avatar">{{ getAuthorInitials(course.authorName) }}</div>
                    <div>
                      <div class="author-name">{{ course.authorName || "Суперадмин" }}</div>
                      <div class="author-role">Суперадмин</div>
                    </div>
                  </div>
                </td>
                <td @click.stop>
                  <div class="row-actions">
                    <button class="icon-btn" @click="goToEdit(course.id)">
                      <Icon name="pencil" :size="16" />
                    </button>
                    <div class="menu-wrap" @click.stop>
                      <button class="icon-btn" @click="toggleMenu(course.id)">
                        <Icon name="more-horizontal" :size="16" />
                      </button>
                      <div v-if="openMenuId === course.id" class="dropdown-menu table-dropdown">
                        <button
                          class="dropdown-item"
                          @click="
                            goToEdit(course.id);
                            openMenuId = null;
                          "
                        >
                          <Icon name="pencil" :size="14" /> Редактировать
                        </button>
                        <button
                          v-if="course.status === 'published'"
                          class="dropdown-item"
                          @click="
                            handleArchive(course);
                            openMenuId = null;
                          "
                        >
                          <Icon name="archive" :size="14" /> Закрыть
                        </button>
                        <button
                          v-if="course.status !== 'published'"
                          class="dropdown-item danger"
                          @click="
                            handleDelete(course);
                            openMenuId = null;
                          "
                        >
                          <Icon name="trash" :size="14" /> Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Пагинация -->
        <Pagination
          :total="courses.length"
          :page="currentPage"
          :limit="pageSize"
          @update:page="currentPage = $event"
          @update:limit="
            pageSize = $event;
            currentPage = 1;
          "
        />
      </div>
    </template>

    <!-- Сводка аналитики -->
    <div class="section-block">
      <div class="section-head">
        <h2 class="section-title">Сводка аналитики</h2>
        <button class="help-btn" title="Справка"><Icon name="circle-help" :size="16" /></button>
      </div>
      <AnalyticsSummaryCards />
    </div>

    <!-- Воронка по курсам -->
    <div v-if="funnel.length > 0" class="section-block">
      <div class="section-head funnel-head">
        <div>
          <h2 class="section-title">Воронка по курсам</h2>
          <p class="section-desc">Назначения, прогресс и суммарное время прохождения по каждому курсу.</p>
        </div>
        <Select v-model="funnelPeriod" :options="[{ value: '30days', label: 'Последние 30 дней' }]" size="sm" />
      </div>

      <!-- Столбчатая диаграмма воронки -->
      <div class="funnel-bars">
        <div v-for="col in funnelColumns" :key="col.key" class="funnel-col">
          <div class="funnel-bar-wrap">
            <div v-if="col.count === 0" class="funnel-bar-zero"></div>
            <div v-else class="funnel-bar" :style="{ height: col.heightPct + '%' }"></div>
          </div>
          <div class="funnel-col-label">{{ col.label }}</div>
          <div class="funnel-col-count">{{ col.count }}</div>
        </div>
      </div>

      <!-- Таблица воронки -->
      <div class="table-scroll">
        <table class="courses-table">
          <thead>
            <tr>
              <th>Курс</th>
              <th>Назначено</th>
              <th>Завершили</th>
              <th>Конверсия</th>
              <th>Ср. балл</th>
              <th>Ср. время</th>
              <th>Прогресс</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in funnel" :key="row.courseId">
              <td>{{ row.courseTitle }}</td>
              <td>{{ row.assignedCount }}</td>
              <td>{{ row.completedCount }}</td>
              <td>{{ row.assignedCount > 0 ? Math.round((row.completedCount / row.assignedCount) * 100) : 0 }}%</td>
              <td>{{ row.avgCourseScore }}%</td>
              <td>{{ formatDuration(row.totalTimeSpentSeconds) }}</td>
              <td>
                <div class="progress-cell">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: row.avgProgress + '%' }"></div>
                  </div>
                  <span class="progress-pct">{{ row.avgProgress }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="funnel-link-row">
        <a href="#" class="funnel-link">Смотреть детальную статистику →</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Badge, Button, Icon, Preloader, FilterBar, Select, Tabs, PageHeader, EmptyState, Pagination } from "@/components/ui";
import AnalyticsSummaryCards from "@/components/courses/AnalyticsSummaryCards.vue";
import { archiveCourse, deleteCourse, getCourses, getCourseAnalyticsFunnel } from "@/api/courses";
import { useToast } from "@/composables/useToast";

const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const courses = ref([]);
const funnel = ref([]);
const viewMode = ref("cards");

const viewTabsConfig = [
  { value: "cards", label: "Карточки", icon: "layout-grid" },
  { value: "table", label: "Таблица", icon: "table-2" },
];
const openMenuId = ref(null);
const currentPage = ref(1);
const pageSize = ref(10);
const funnelPeriod = ref("30days");

const filters = ref({
  search: "",
  status: "",
  author: "",
});

// Модель для FilterBar (синхронизируется с filters)
const filterBarModel = computed({
  get: () => filters.value,
  set: (val) => {
    filters.value = val;
  },
});

const pageSizeOptions = [
  { value: 10, label: "10 на странице" },
  { value: 25, label: "25 на странице" },
  { value: 50, label: "50 на странице" },
];

const statusFilterOptions = [
  { value: "published", label: "Опубликован" },
  { value: "draft", label: "Черновик" },
  { value: "archived", label: "Закрыт" },
];

const courseFilterDefs = computed(() => [
  {
    key: "status",
    label: "Все статусы",
    type: "select",
    placeholder: "Все статусы",
    options: statusFilterOptions,
  },
  {
    key: "author",
    label: "Все авторы",
    type: "select",
    placeholder: "Все авторы",
    options: [],
  },
]);

const getStatusLabel = (status) => {
  const labels = {
    published: "Опубликован",
    draft: "Черновик",
    archived: "Закрыт",
  };
  return labels[status] || status;
};

const hasUnpublishedChanges = (course) => {
  if (!course || course.status !== "published") return false;

  const publishedAtTs = Date.parse(course.publishedAt || "");
  const updatedAtTs = Date.parse(course.updatedAt || "");

  if (!Number.isFinite(publishedAtTs) || !Number.isFinite(updatedAtTs)) return false;

  return updatedAtTs > publishedAtTs;
};

const getStatusVariant = (status) => {
  const variants = {
    published: "success",
    draft: "info",
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
    author: "",
  };
  loadCourses();
};

const goToCreate = () => {
  router.push("/courses/create");
};

const goToEdit = (id) => {
  router.push(`/courses/${id}/edit`);
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

// Палитра иконок карточек
const ICON_PALETTES = [
  { bg: "#e6f4fa", color: "#0088cc" },
  { bg: "#fef5e7", color: "#f59e0b" },
  { bg: "#fde8e8", color: "#ef4444" },
  { bg: "#e8f8f2", color: "#10b981" },
];

// Пагинация
const totalPages = computed(() => Math.max(1, Math.ceil(courses.value.length / pageSize.value)));

const paginatedCourses = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return courses.value.slice(start, start + pageSize.value);
});

// Данные для столбчатой диаграммы воронки
const funnelColumns = computed(() => {
  const totals = funnel.value.reduce(
    (acc, row) => {
      acc.assigned += row.assignedCount || 0;
      acc.started += row.startedCount || 0;
      acc.inProgress += row.inProgressCount || 0;
      acc.completed += row.completedCount || 0;
      return acc;
    },
    { assigned: 0, started: 0, inProgress: 0, completed: 0 },
  );

  const maxCount = Math.max(totals.assigned, totals.started, totals.inProgress, totals.completed, 1);
  const pct = (n) => Math.round((n / maxCount) * 100);
  const conv = (n) => (totals.assigned > 0 ? Math.round((n / totals.assigned) * 100) : null);

  return [
    { key: "assigned", label: "Назначено", count: totals.assigned, heightPct: pct(totals.assigned), convPct: null },
    { key: "started", label: "Начали", count: totals.started, heightPct: pct(totals.started), convPct: conv(totals.started) },
    { key: "inProgress", label: "Проходят", count: totals.inProgress, heightPct: pct(totals.inProgress), convPct: conv(totals.inProgress) },
    { key: "completed", label: "Завершили", count: totals.completed, heightPct: pct(totals.completed), convPct: conv(totals.completed) },
  ];
});

const toggleMenu = (id) => {
  openMenuId.value = openMenuId.value === id ? null : id;
};

const closeMenus = () => {
  openMenuId.value = null;
};

const getAuthorInitials = (name) => {
  if (!name) return "СА";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
};
</script>

<style scoped>
/* ===== Базовый контейнер ===== */
.courses-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== Фильтры ===== */
.filters-bar {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 1px solid var(--divider);
  border-radius: 14px;
  padding: 0 8px 0 16px;
  height: 52px;
  gap: 0;
}

.filters-search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
}

.search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
  height: 100%;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.filter-sep {
  width: 1px;
  height: 24px;
  background: var(--divider);
  flex-shrink: 0;
  margin: 0 12px;
}

.filter-select {
  height: 36px;
  padding: 0 28px 0 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: transparent
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%234b4b4b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")
    no-repeat right 8px center;
  border: none;
  border-radius: 0;
  appearance: none;
  outline: none;
  cursor: pointer;
  margin: 0;
  white-space: nowrap;
}

.filter-select:focus {
  outline: none;
}

.filter-reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 36px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 4px;
  transition:
    background 0.15s,
    color 0.15s;
}

.filter-reset-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* ===== Карточный режим ===== */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.course-card {
  background: var(--bg-primary);
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
}

.course-card:hover {
  border-color: hsl(var(--primary) / 0.3);
}

/* Статус-индикатор слева на карточке */
.course-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: transparent;
  transition: background 0.2s ease;
}

.course-card:has(.status-badge[data-status="published"])::before {
  background: hsl(var(--accent-green));
}

.course-card:has(.status-badge[data-status="draft"])::before {
  background: hsl(var(--accent-blue));
}

.course-card:has(.status-badge[data-status="archived"])::before {
  background: hsl(var(--muted-foreground));
}

/* Шапка карточки: иконка + заголовок + описание */
.card-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.course-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.card-title-block {
  flex: 1;
  min-width: 0;
}

.course-name {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.course-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status-cell-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.draft-warning-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid #f7d7a8;
  background: #fff8ec;
  color: #8b5a14;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 6px 10px;
  margin-top: 8px;
}

.draft-warning-chip-table {
  margin-top: 0;
}

.status-badge {
  align-self: flex-start;
}

.course-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.stat-label {
  flex: 1;
}

.stat-val {
  font-weight: 500;
  color: var(--text-primary);
}

.card-footer {
  display: flex;
  gap: 8px;
  border-top: 1px solid var(--divider);
  padding-top: 12px;
  margin-top: auto;
}

.card-edit-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--accent-purple-soft));
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  text-align: center;
}

.card-edit-btn:hover {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}

.menu-wrap {
  position: relative;
}

.menu-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s;
}

.menu-btn:hover {
  background: var(--divider);
}

/* ===== Выпадающее меню ===== */
.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--bg-primary);
  border: 1px solid var(--divider);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 160px;
  overflow: hidden;
}

.table-dropdown {
  right: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item.danger {
  color: #ef4444;
}

/* ===== Табличный режим ===== */
.table-container {
  background: var(--bg-primary);
  border: 1px solid var(--divider);
  border-radius: 16px;
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.courses-table {
  width: 100%;
  border-collapse: collapse;
}

.courses-table thead {
  border-bottom: 1px solid var(--divider);
}

.courses-table th {
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  text-align: left;
  white-space: nowrap;
}

.courses-table td {
  padding: 14px 16px;
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}

.courses-table tbody tr:last-child td {
  border-bottom: none;
}

.courses-table tbody tr:hover td {
  background: hsl(var(--table-row-hover));
}

/* Inline-кнопки появляются при hover строки */
.courses-table tbody tr .icon-btn {
  opacity: 0.4;
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.courses-table tbody tr:hover .icon-btn {
  opacity: 1;
}

.icon-btn:hover {
  background: hsl(var(--state-hover));
  color: hsl(var(--primary));
  opacity: 1;
}

.cell-name {
  font-weight: 600;
  color: var(--text-primary);
}

.cell-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ===== Автор ===== */
.author-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: hsl(var(--accent-blue-soft));
  color: hsl(var(--accent-blue));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.author-role {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== Действия в таблице ===== */
.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition:
    background 0.15s,
    color 0.15s;
}

.icon-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* ===== Секции аналитики ===== */
.section-block {
  background: var(--bg-primary);
  border: 1px solid var(--divider);
  border-radius: 16px;
  padding: 20px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.funnel-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.help-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  padding: 0;
}

.period-select {
  padding: 6px 10px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--divider);
  border-radius: 8px;
  cursor: pointer;
  outline: none;
}

/* ===== Воронка: столбчатая диаграмма ===== */
.funnel-bars {
  display: flex;
  gap: 0;
  align-items: flex-end;
  height: 180px;
  padding-bottom: 0;
  border-bottom: 1px solid var(--divider);
  margin-bottom: 0;
}

.funnel-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding-bottom: 16px;
}

.funnel-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
}

.funnel-bar {
  width: 56px;
  background: hsl(var(--accent-blue));
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
}

/* Нулевой бар — горизонтальная линия */
.funnel-bar-zero {
  width: 56px;
  height: 3px;
  background: hsl(var(--accent-blue));
  border-radius: 2px;
}

.funnel-col-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  margin-bottom: 2px;
}

.funnel-col-count {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* ===== Прогресс в воронке ===== */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: var(--divider);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--accent-blue));
  border-radius: 999px;
  transition: width 0.3s;
}

.progress-pct {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.funnel-link-row {
  margin-top: 12px;
  text-align: right;
}

.funnel-link {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--accent-blue));
  text-decoration: none;
}

.funnel-link:hover {
  text-decoration: underline;
}

@media (max-width: 1280px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-bar {
    flex-wrap: wrap;
  }
}

@media (max-width: 600px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
