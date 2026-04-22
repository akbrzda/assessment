<template>
  <article class="subtopic-item" :class="`state-${resolvedState}`">
    <div class="subtopic-main">
      <div class="subtopic-order">Подтема {{ index + 1 }}</div>
      <h4 class="subtopic-title">{{ topic.title }}</h4>
      <p v-if="descriptionText" class="subtopic-description">{{ descriptionText }}</p>
    </div>

    <div class="subtopic-actions">
      <StatusBadge :status="badgeStatus" :text="badgeText" />
      <button v-if="canOpen" class="btn btn-primary" type="button" @click="$emit('open', topic)">
        Открыть
      </button>
      <button v-else class="btn btn-secondary" type="button" @click="$emit('lock-click', topic)">
        Причина блокировки
      </button>
    </div>
  </article>
</template>

<script>
import { computed } from "vue";
import StatusBadge from "./StatusBadge.vue";

export default {
  name: "SubtopicItem",
  components: {
    StatusBadge,
  },
  emits: ["open", "lock-click"],
  props: {
    topic: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const resolvedState = computed(() => {
      const status = props.topic?.progress?.status || "not_started";
      const isLocked = Boolean(props.topic?.progress?.locked);
      if (isLocked && status === "completed") return "completed_locked";
      if (isLocked) return "locked";
      if (status === "in_progress") return "in_progress";
      if (status === "completed") return "completed";
      return "not_started";
    });

    const canOpen = computed(() => !["locked", "completed_locked"].includes(resolvedState.value));

    const badgeStatus = computed(() => {
      if (resolvedState.value === "locked" || resolvedState.value === "completed_locked") {
        return "closed";
      }
      return props.topic?.progress?.status || "not_started";
    });

    const badgeText = computed(() => {
      switch (resolvedState.value) {
        case "in_progress":
          return "В процессе";
        case "completed":
          return "Завершена";
        case "completed_locked":
          return "Завершена, но заблокирована";
        case "locked":
          return "Заблокирована";
        default:
          return "Не начата";
      }
    });

    const descriptionText = computed(() => {
      if (resolvedState.value === "completed_locked" || resolvedState.value === "locked") {
        return props.topic?.progress?.lockReasonText || "Доступ временно ограничен";
      }
      if (props.topic?.assessmentId && props.topic?.hasMaterial) {
        return "Сначала материал, затем тест";
      }
      if (props.topic?.assessmentId) {
        return "Подтема с тестом";
      }
      if (props.topic?.hasMaterial) {
        return "Подтема с материалом";
      }
      return "Подтема без материалов";
    });

    return {
      resolvedState,
      canOpen,
      badgeStatus,
      badgeText,
      descriptionText,
    };
  },
};
</script>

<style scoped>
.subtopic-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--divider, #e2e8f0);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-primary, #ffffff);
}

.subtopic-main {
  min-width: 0;
}

.subtopic-order {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

.subtopic-title {
  margin: 4px 0;
  font-size: 16px;
}

.subtopic-description {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
}

.subtopic-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.state-completed {
  border-color: rgba(34, 197, 94, 0.35);
}

.state-completed_locked,
.state-locked {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.05);
}

@media (max-width: 640px) {
  .subtopic-item {
    flex-direction: column;
  }

  .subtopic-actions {
    align-items: stretch;
  }
}
</style>
