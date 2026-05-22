<template>
  <div>
    <PageHeader title="Журнал действий" subtitle="Аудит операций администраторов системы" />

    <!-- Фильтры -->
    <FilterBar
      v-model="filters"
      search-key="action"
      search-placeholder="Поиск по действию..."
      :filter-defs="filterDefs"
      class="mb-4"
      @change="onFilterChange"
    />

    <!-- Дополнительные фильтры: дата -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <DatePicker v-model="filters.from" placeholder="С даты" clearable class="w-44" @update:modelValue="onFilterChange" />
      <span class="text-muted-foreground text-sm">—</span>
      <DatePicker v-model="filters.to" placeholder="По дату" clearable class="w-44" @update:modelValue="onFilterChange" />
      <Button v-if="hasDateFilter" variant="ghost" size="sm" @click="clearDates">Сбросить даты</Button>
    </div>

    <!-- Загрузка -->
    <SkeletonTable v-if="isLoading" :rows="12" :cols="6" />

    <!-- Ошибка -->
    <Alert v-else-if="errorMessage" variant="error" :message="errorMessage" class="mb-4" />

    <!-- Пустое состояние -->
    <EmptyState v-else-if="!logs.length" title="Записей не найдено" description="Попробуйте изменить фильтры." />

    <!-- Таблица -->
    <div v-else>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Актор</TableHead>
            <TableHead>Действие</TableHead>
            <TableHead>Объект</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>IP</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="log in logs" :key="log.id">
            <TableCell class="whitespace-nowrap text-sm text-muted-foreground">{{ formatDate(log.created_at) }}</TableCell>
            <TableCell>
              <div class="leading-tight">
                <div class="text-sm font-medium">{{ log.actor_name || "—" }}</div>
                <div class="text-xs text-muted-foreground">{{ log.actor_role || "" }}</div>
              </div>
            </TableCell>
            <TableCell>
              <code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{{ log.action }}</code>
            </TableCell>
            <TableCell class="text-sm">
              <span v-if="log.entity_type"
                >{{ log.entity_type }}<span v-if="log.entity_id" class="text-muted-foreground"> #{{ log.entity_id }}</span></span
              >
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>
            <TableCell>
              <Badge :variant="log.status === 'failure' ? 'danger' : 'success'">
                {{ log.status === "failure" ? "Ошибка" : "OK" }}
              </Badge>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground whitespace-nowrap">{{ log.ip_address || "—" }}</TableCell>
            <TableCell>
              <Button size="sm" variant="ghost" @click="openDetail(log)">Детали</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Pagination
        :total="total"
        :page="pagination.page"
        :limit="pagination.limit"
        @update:page="
          pagination.page = $event;
          loadLogs();
        "
        @update:limit="
          pagination.limit = $event;
          pagination.page = 1;
          loadLogs();
        "
      />
    </div>

    <!-- Модал деталей -->
    <Modal :show="!!detailLog" title="Детали записи" @close="detailLog = null">
      <div v-if="detailLog" class="space-y-3 text-sm">
        <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <span class="text-muted-foreground">ID</span>
          <span>{{ detailLog.id }}</span>

          <span class="text-muted-foreground">Дата</span>
          <span>{{ formatDate(detailLog.created_at) }}</span>

          <span class="text-muted-foreground">Актор</span>
          <span
            >{{ detailLog.actor_name || "—" }}
            <span v-if="detailLog.actor_role" class="text-muted-foreground">({{ detailLog.actor_role }})</span></span
          >

          <span class="text-muted-foreground">ID актора</span>
          <span>{{ detailLog.actor_user_id || "—" }}</span>

          <span class="text-muted-foreground">Действие</span>
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{{ detailLog.action }}</code>

          <span class="text-muted-foreground">Scope</span>
          <span>{{ detailLog.scope || "—" }}</span>

          <span class="text-muted-foreground">Объект</span>
          <span
            >{{ detailLog.entity_type || "—" }} <span v-if="detailLog.entity_id" class="text-muted-foreground">#{{ detailLog.entity_id }}</span></span
          >

          <span class="text-muted-foreground">Статус</span>
          <Badge :variant="detailLog.status === 'failure' ? 'danger' : 'success'" class="w-fit">
            {{ detailLog.status === "failure" ? "Ошибка" : "Успех" }}
          </Badge>

          <span class="text-muted-foreground">IP</span>
          <span>{{ detailLog.ip_address || "—" }}</span>
        </div>

        <template v-if="parsedBefore">
          <div class="font-medium text-muted-foreground pt-1">До изменения</div>
          <pre class="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-48">{{ JSON.stringify(parsedBefore, null, 2) }}</pre>
        </template>

        <template v-if="parsedAfter">
          <div class="font-medium text-muted-foreground pt-1">После изменения</div>
          <pre class="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-48">{{ JSON.stringify(parsedAfter, null, 2) }}</pre>
        </template>

        <template v-if="parsedMetadata">
          <div class="font-medium text-muted-foreground pt-1">Метаданные</div>
          <pre class="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-64">{{ JSON.stringify(parsedMetadata, null, 2) }}</pre>
        </template>

        <div class="pt-2 flex justify-end">
          <Button variant="secondary" @click="detailLog = null">Закрыть</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import PageHeader from "@/components/ui/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import Alert from "@/components/ui/Alert.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonTable from "@/components/ui/SkeletonTable.vue";
import Modal from "@/components/ui/Modal.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import Pagination from "@/components/ui/Pagination.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui";
import { getAuditLogs } from "@/api/auditLogs";

const authStore = useAuthStore();
const logs = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const total = ref(0);
const pagination = ref({ page: 1, limit: 20 });

const filters = ref({
  action: "",
  entityType: "",
  status: "",
  from: "",
  to: "",
});

const detailLog = ref(null);

const filterDefs = [
  {
    key: "entityType",
    label: "Тип объекта",
    placeholder: "Все объекты",
    options: [
      { value: "user", label: "Пользователь" },
      { value: "auth", label: "Авторизация" },
      { value: "certificate", label: "Сертификат" },
      { value: "assessment_attempt", label: "Аттестация" },
      { value: "invitation", label: "Приглашение" },
      { value: "branch", label: "Филиал" },
      { value: "position", label: "Должность" },
      { value: "course", label: "Курс" },
      { value: "badge", label: "Бейдж" },
      { value: "level", label: "Уровень" },
      { value: "gamification_rule", label: "Правило геймификации" },
    ],
  },
  {
    key: "status",
    label: "Статус",
    placeholder: "Все статусы",
    options: [
      { value: "success", label: "Успех" },
      { value: "failure", label: "Ошибка" },
    ],
  },
];

const hasDateFilter = computed(() => filters.value.from || filters.value.to);

function onFilterChange() {
  pagination.value.page = 1;
  loadLogs();
}

function clearDates() {
  filters.value.from = "";
  filters.value.to = "";
  onFilterChange();
}

async function loadLogs() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };
    if (filters.value.action) params.action = filters.value.action;
    if (filters.value.entityType) params.entityType = filters.value.entityType;
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.from) params.from = filters.value.from;
    if (filters.value.to) params.to = filters.value.to;

    const result = await getAuditLogs(params);
    logs.value = result.data?.items || [];
    total.value = result.data?.pagination?.total || 0;
  } catch (err) {
    console.error("[AuditLogsView] ошибка загрузки:", err);
    errorMessage.value = err?.response?.data?.error || err.message || "Ошибка загрузки";
  } finally {
    isLoading.value = false;
  }
}

function openDetail(log) {
  detailLog.value = log;
}

const parsedBefore = computed(() => {
  if (!detailLog.value?.before_json) return null;
  try {
    return typeof detailLog.value.before_json === "string" ? JSON.parse(detailLog.value.before_json) : detailLog.value.before_json;
  } catch {
    return null;
  }
});

const parsedAfter = computed(() => {
  if (!detailLog.value?.after_json) return null;
  try {
    return typeof detailLog.value.after_json === "string" ? JSON.parse(detailLog.value.after_json) : detailLog.value.after_json;
  } catch {
    return null;
  }
});

const parsedMetadata = computed(() => {
  if (!detailLog.value?.metadata_json) return null;
  try {
    return typeof detailLog.value.metadata_json === "string" ? JSON.parse(detailLog.value.metadata_json) : detailLog.value.metadata_json;
  } catch {
    return null;
  }
});

function formatDate(iso) {
  if (!iso) return "—";
  const userTimeZone = authStore.user?.timezone || "UTC";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: userTimeZone,
  });
}

onMounted(loadLogs);
</script>
