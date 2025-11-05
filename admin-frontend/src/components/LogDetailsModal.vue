<template>
  <Modal :show="show" title="Детали действия" size="lg" @close="$emit('close')">
    <div v-if="log" class="log-details">
      <!-- Основная информация -->
      <div class="details-section">
        <h3 class="section-title">Основная информация</h3>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Дата и время:</span>
            <span class="detail-value">{{ formatFullDate(log.created_at) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Администратор:</span>
            <span class="detail-value">{{ resolveAdminName(log) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Роль:</span>
            <Badge v-if="log.role_name" :variant="getRoleVariant(log.role_name)" rounded>{{ log.role_name }}</Badge>
            <span v-else class="detail-value">—</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Тип действия:</span>
            <Badge :variant="getActionVariant(log.action_type)">{{ log.action_type }}</Badge>
          </div>
          <div class="detail-item" v-if="log.entity_type">
            <span class="detail-label">Тип сущности:</span>
            <span class="detail-value">{{ log.entity_type }}</span>
          </div>
          <div class="detail-item" v-if="log.entity_id">
            <span class="detail-label">ID сущности:</span>
            <span class="detail-value">{{ log.entity_id }}</span>
          </div>
        </div>
      </div>

      <!-- Описание -->
      <div class="details-section">
        <h3 class="section-title">Описание</h3>
        <p class="description-text">{{ log.description }}</p>
      </div>

      <!-- Изменения (если есть) -->
      <div class="details-section" v-if="changes && Object.keys(changes).length > 0">
        <h3 class="section-title">Изменения</h3>
        <div class="changes-table">
          <div class="changes-row" v-for="(value, key) in changes" :key="key">
            <div class="changes-field">{{ key }}</div>
            <div class="changes-old">
              <span class="changes-label">Старое:</span>
              <span class="changes-value">{{ formatValue(value.old) }}</span>
            </div>
            <div class="changes-new">
              <span class="changes-label">Новое:</span>
              <span class="changes-value">{{ formatValue(value.new) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Технические данные -->
      <div class="details-section">
        <h3 class="section-title">Технические данные</h3>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">IP-адрес:</span>
            <span class="detail-value code">{{ log.ip_address || "—" }}</span>
          </div>
          <div class="detail-item full-width" v-if="log.user_agent">
            <span class="detail-label">User Agent:</span>
            <span class="detail-value code small">{{ log.user_agent }}</span>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { computed } from "vue";
import Modal from "./ui/Modal.vue";
import Badge from "./ui/Badge.vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  log: {
    type: Object,
    default: null,
  },
});

defineEmits(["close"]);

const changes = computed(() => {
  if (!props.log?.changes) return null;
  try {
    return typeof props.log.changes === "string" ? JSON.parse(props.log.changes) : props.log.changes;
  } catch (e) {
    return null;
  }
});

const formatFullDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const getRoleVariant = (role) => {
  if (!role) return "secondary";
  if (role === "superadmin") return "danger";
  if (role === "manager") return "primary";
  return "info";
};

const getActionVariant = (actionType) => {
  if (actionType.includes("create") || actionType.includes("CREATE")) return "success";
  if (actionType.includes("update") || actionType.includes("UPDATE")) return "primary";
  if (actionType.includes("delete") || actionType.includes("DELETE")) return "danger";
  if (actionType.includes("login") || actionType.includes("LOGIN")) return "warning";
  return "info";
};

const resolveAdminName = (log) => {
  if (!log) return "—";
  const display = (log.display_name || log.admin_username || "").trim();
  if (display) return display;
  const fallback = `${log.first_name || ""} ${log.last_name || ""}`.trim();
  return fallback || "—";
};
</script>

<style scoped>
.log-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details-section {
  border-bottom: 1px solid var(--divider);
  padding-bottom: 24px;
}

.details-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 15px;
  color: var(--text-primary);
}

.detail-value.code {
  font-family: "Courier New", monospace;
  font-size: 14px;
  background-color: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
}

.detail-value.code.small {
  font-size: 12px;
  word-break: break-all;
}

.description-text {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

.changes-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.changes-row {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: 16px;
  align-items: center;
}

.changes-field {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.changes-old,
.changes-new {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.changes-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.changes-value {
  font-size: 14px;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  background-color: var(--card-bg);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-word;
}

@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .changes-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
