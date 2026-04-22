<template>
  <span class="status-badge" :class="variantClass">
    {{ label }}
  </span>
</template>

<script>
import { computed } from "vue";

const STATUS_MAP = {
  not_started: { label: "Не начат", className: "is-default" },
  in_progress: { label: "В процессе", className: "is-primary" },
  completed: { label: "Завершен", className: "is-success" },
  closed: { label: "Закрыт", className: "is-muted" },
  archived: { label: "Закрыт", className: "is-muted" },
  open: { label: "Открыта", className: "is-primary" },
  pending: { label: "Ожидает", className: "is-default" },
  failed: { label: "Не пройден", className: "is-warning" },
  passed: { label: "Пройден", className: "is-success" },
};

export default {
  name: "StatusBadge",
  props: {
    status: {
      type: String,
      default: "not_started",
    },
    text: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const resolved = computed(() => STATUS_MAP[props.status] || STATUS_MAP.not_started);
    const label = computed(() => props.text || resolved.value.label);
    const variantClass = computed(() => resolved.value.className);

    return {
      label,
      variantClass,
    };
  },
};
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid transparent;
}

.is-default {
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
  border-color: rgba(148, 163, 184, 0.3);
}

.is-primary {
  background: rgba(59, 130, 246, 0.16);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.35);
}

.is-success {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.3);
}

.is-muted {
  background: rgba(148, 163, 184, 0.1);
  color: #475569;
  border-color: rgba(148, 163, 184, 0.25);
}

.is-warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.32);
}
</style>
