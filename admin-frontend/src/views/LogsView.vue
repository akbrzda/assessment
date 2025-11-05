<template>
  <div class="logs-view">
    <!-- Заголовок -->
    <div class="page-header">
      <div>
        <h1 class="page-heading">Журнал действий</h1>
        <p class="page-subtitle">История всех операций администраторов</p>
      </div>
      <div class="header-actions">
        <Button variant="ghost" @click="handleExport" :loading="exporting" icon="file-chart-column"> Экспорт в Excel </Button>
        <Button variant="primary" @click="handleSendToTelegram" :loading="sending" icon="send"> Отправить в Telegram </Button>
      </div>
    </div>

    <!-- Фильтры -->
    <Card class="filters-card" title="Фильтры">
      <div class="filters-grid">
        <Input v-model="filters.search" label="Поиск" placeholder="Поиск по описанию или администратору..." @input="debouncedSearch" />
        <Select v-model="filters.action_type" label="Тип действия" :options="actionTypeOptions" @change="loadLogs" />
        <Select v-model="filters.entity_type" label="Тип сущности" :options="entityTypeOptions" @change="loadLogs" />
        <Input v-model="filters.date_from" label="Дата от" type="date" @change="loadLogs" />
        <Input v-model="filters.date_to" label="Дата до" type="date" @change="loadLogs" />
        <div class="filter-button">
          <Button variant="secondary" @click="resetFilters" full-width icon="refresh-ccw"> Сбросить </Button>
        </div>
      </div>
    </Card>

    <!-- Загрузка -->
    <Preloader v-if="loading" />

    <!-- Таблица логов -->
    <Card v-else padding="none">
      <!-- Десктоп -->
      <div class="table-wrapper hide-mobile">
        <table class="logs-table">
          <thead>
            <tr>
              <th style="width: 160px">Дата и время</th>
              <th style="width: 150px">Администратор</th>
              <th style="width: 120px">Действие</th>
              <th style="width: 100px">Сущность</th>
              <th>Описание</th>
              <th style="width: 120px">IP-адрес</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="empty-state">Логи не найдены</td>
            </tr>
            <tr v-for="log in logs" :key="log.id" @click="openLogDetails(log)" class="clickable-row">
              <td class="log-date">{{ formatDate(log.created_at) }}</td>
              <td class="log-admin">
                {{ resolveAdminName(log) }}
                <Badge v-if="log.role_name" :variant="getRoleVariant(log.role_name)" rounded>{{ log.role_name }}</Badge>
              </td>
              <td>
                <Badge :variant="getActionVariant(log.action_type)">{{ log.action_type }}</Badge>
              </td>
              <td class="log-entity">{{ log.entity_type || "—" }}</td>
              <td class="log-description">{{ log.description }}</td>
              <td class="log-ip">{{ log.ip_address || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Мобильные карточки -->
      <div class="mobile-cards show-mobile">
        <div v-if="logs.length === 0" class="empty-state">Логи не найдены</div>
        <div v-for="log in logs" :key="log.id" class="mobile-card">
          <div class="mobile-card-row">
            <span class="mobile-label">Дата и время</span>
            <span class="mobile-value log-date">{{ formatDate(log.created_at) }}</span>
          </div>
          <div class="mobile-card-row">
            <span class="mobile-label">Администратор</span>
            <span class="mobile-value">
              {{ resolveAdminName(log) }}
              <Badge v-if="log.role_name" :variant="getRoleVariant(log.role_name)" rounded>{{ log.role_name }}</Badge>
            </span>
          </div>
          <div class="mobile-card-row">
            <span class="mobile-label">Действие</span>
            <Badge :variant="getActionVariant(log.action_type)">{{ log.action_type }}</Badge>
          </div>
          <div class="mobile-card-row">
            <span class="mobile-label">Сущность</span>
            <span class="mobile-value log-entity">{{ log.entity_type || "—" }}</span>
          </div>
          <div class="mobile-card-row">
            <span class="mobile-label">Описание</span>
            <span class="mobile-value log-description">{{ log.description }}</span>
          </div>
          <div class="mobile-card-row">
            <span class="mobile-label">IP-адрес</span>
            <span class="mobile-value log-ip">{{ log.ip_address || "—" }}</span>
          </div>
        </div>
      </div>
    </Card>

    <!-- Пагинация -->
    <div v-if="pagination.pages > 1" class="pagination">
      <button @click="changePage(pagination.page - 1)" :disabled="pagination.page === 1" class="pagination-btn">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="pagination-info"> Страница {{ pagination.page }} из {{ pagination.pages }} (всего: {{ pagination.total }}) </span>
      <button @click="changePage(pagination.page + 1)" :disabled="pagination.page === pagination.pages" class="pagination-btn">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Модальное окно с деталями лога -->
    <LogDetailsModal :show="showLogDetailsModal" :log="selectedLog" @close="closeLogDetails" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import logsApi from "../api/logs";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import Preloader from "../components/ui/Preloader.vue";
import LogDetailsModal from "../components/LogDetailsModal.vue";

const loading = ref(false);
const exporting = ref(false);
const sending = ref(false);
const logs = ref([]);
const actionTypes = ref([]);
const entityTypes = ref([]);
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
});
const filters = ref({
  search: "",
  action_type: "",
  entity_type: "",
  date_from: "",
  date_to: "",
});

const showLogDetailsModal = ref(false);
const selectedLog = ref(null);

let searchTimeout = null;

// Опции для Select
const actionTypeOptions = computed(() => [{ value: "", label: "Все действия" }, ...actionTypes.value.map((type) => ({ value: type, label: type }))]);

const entityTypeOptions = computed(() => [{ value: "", label: "Все сущности" }, ...entityTypes.value.map((type) => ({ value: type, label: type }))]);

// Загрузка логов
const loadLogs = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value,
    };

    // Удалить пустые фильтры
    Object.keys(params).forEach((key) => {
      if (!params[key]) delete params[key];
    });

    const data = await logsApi.getLogs(params);
    logs.value = data.logs;
    pagination.value = data.pagination;
  } catch (error) {
    console.error("Ошибка загрузки логов:", error);
    alert("Не удалось загрузить логи");
  } finally {
    loading.value = false;
  }
};

// Загрузка типов действий и сущностей
const loadFiltersData = async () => {
  try {
    const [actions, entities] = await Promise.all([logsApi.getActionTypes(), logsApi.getEntityTypes()]);
    actionTypes.value = actions;
    entityTypes.value = entities;
  } catch (error) {
    console.error("Ошибка загрузки фильтров:", error);
  }
};

// Отложенный поиск
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    loadLogs();
  }, 500);
};

// Сброс фильтров
const resetFilters = () => {
  filters.value = {
    search: "",
    action_type: "",
    entity_type: "",
    date_from: "",
    date_to: "",
  };
  pagination.value.page = 1;
  loadLogs();
};

// Отображаемое имя администратора
const resolveAdminName = (log) => {
  if (!log) return "—";
  const display = (log.display_name || log.admin_username || "").trim();
  if (display) return display;
  const fallback = `${log.first_name || ""} ${log.last_name || ""}`.trim();
  return fallback || "—";
};

// Изменение страницы
const changePage = (page) => {
  pagination.value.page = page;
  loadLogs();
};

// Форматирование даты
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Вариант Badge для роли
const getRoleVariant = (role) => {
  if (!role) return "secondary";
  if (role === "superadmin") return "danger";
  if (role === "manager") return "primary";
  return "info";
};

// Вариант Badge для действия
const getActionVariant = (actionType) => {
  if (actionType.includes("create") || actionType.includes("CREATE")) return "success";
  if (actionType.includes("update") || actionType.includes("UPDATE")) return "primary";
  if (actionType.includes("delete") || actionType.includes("DELETE")) return "danger";
  if (actionType.includes("login") || actionType.includes("LOGIN")) return "warning";
  return "info";
};

// Открыть детали лога
const openLogDetails = (log) => {
  selectedLog.value = log;
  showLogDetailsModal.value = true;
};

// Закрыть модальное окно
const closeLogDetails = () => {
  showLogDetailsModal.value = false;
  selectedLog.value = null;
};

// Экспорт в Excel
const handleExport = async () => {
  if (exporting.value) return;

  exporting.value = true;
  try {
    const params = { ...filters.value };
    Object.keys(params).forEach((key) => {
      if (!params[key]) delete params[key];
    });

    const blob = await logsApi.exportLogs(params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    alert("Экспорт завершен успешно");
  } catch (error) {
    console.error("Export error:", error);
    alert("Ошибка экспорта");
  } finally {
    exporting.value = false;
  }
};

// Отправить в Telegram
const handleSendToTelegram = async () => {
  if (sending.value) return;

  const confirmed = confirm("Отправить логи за последние сутки в Telegram?");
  if (!confirmed) return;

  sending.value = true;
  try {
    const data = {
      date_from: filters.value.date_from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      date_to: filters.value.date_to || new Date().toISOString().split("T")[0],
      limit: 50,
    };

    await logsApi.sendLogsToTelegram(data);
    alert("Логи успешно отправлены в Telegram");
  } catch (error) {
    console.error("Send to Telegram error:", error);
    alert("Ошибка отправки в Telegram");
  } finally {
    sending.value = false;
  }
};

onMounted(() => {
  loadLogs();
  loadFiltersData();
});
</script>

<style scoped>
.logs-view {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-actions .icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.filters-card {
  margin-bottom: 32px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto;
  gap: 16px;
  align-items: end;
}

.filter-button {
  display: flex;
  align-items: flex-end;
}

.filter-button .icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.hide-mobile {
  display: block;
}

.show-mobile {
  display: none;
}

/* Таблица */
.table-wrapper {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

.logs-table th {
  background: var(--bg-secondary);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logs-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.logs-table tbody tr:last-child td {
  border-bottom: none;
}

.logs-table tbody tr.clickable-row {
  cursor: pointer;
}

.log-date {
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
  font-size: 13px;
}

.log-admin {
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-entity {
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
  font-size: 13px;
}

.log-description {
  color: var(--text-primary);
}

.log-ip {
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px !important;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Мобильные карточки */
.mobile-cards {
  padding: 16px;
}

.mobile-card {
  border-bottom: 1px solid var(--border-color);
  padding: 16px 0;
}

.mobile-card:last-child {
  border-bottom: none;
}

.mobile-card-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.mobile-card-row:last-child {
  margin-bottom: 0;
}

.mobile-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 100px;
}

.mobile-value {
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* Пагинация */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination-btn {
  padding: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--accent-blue);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-btn .icon {
  width: 18px;
  height: 18px;
  color: var(--text-primary);
}

.pagination-info {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Адаптивность */
@media (max-width: 1400px) {
  .filters-grid {
    grid-template-columns: 2fr 1fr 1fr;
    align-items: stretch;
  }

  .filter-button {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1024px) {
  .hide-mobile {
    display: none !important;
  }

  .show-mobile {
    display: block !important;
  }

  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
  }

  .page-heading {
    font-size: 24px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .mobile-card-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .mobile-value {
    text-align: left;
    justify-content: flex-start;
  }
}
</style>
