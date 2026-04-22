<template>
  <article class="subtopic-row" :class="`state-${resolvedState}`">
    <div class="row-marker" aria-hidden="true">
      <span class="marker-dot">{{ markerSymbol }}</span>
      <span class="marker-line"></span>
    </div>

    <div class="row-card">
      <div class="row-card__thumb">{{ index + 1 }}</div>

      <div class="row-card__content">
        <h4 class="row-title">{{ topic.title }}</h4>
        <p v-if="descriptionText" class="row-description">{{ descriptionText }}</p>
      </div>

      <div class="row-card__actions">
        <StatusBadge :status="badgeStatus" :text="badgeText" />
        <button v-if="canOpen" class="btn btn-primary row-btn" type="button" @click="$emit('open', topic)">
          Открыть
        </button>
        <button v-else class="btn btn-secondary row-btn" type="button" @click="$emit('lock-click', topic)">
          Причина
        </button>
      </div>
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
          return "Пройдена, но закрыта";
        case "locked":
          return "Закрыта";
        default:
          return "Не начата";
      }
    });

    const markerSymbol = computed(() => {
      if (resolvedState.value === "locked" || resolvedState.value === "completed_locked") {
        return "🔒";
      }
      if (resolvedState.value === "completed") {
        return "✓";
      }
      if (resolvedState.value === "in_progress") {
        return "▶";
      }
      return "•";
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
      markerSymbol,
      descriptionText,
    };
  },
};
</script>

<style scoped>
.subtopic-row {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 10px;
}

.row-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #dbe2f8;
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.marker-line {
  width: 2px;
  flex: 1;
  margin-top: 6px;
  background: repeating-linear-gradient(
    to bottom,
    #d1d5db 0,
    #d1d5db 5px,
    transparent 5px,
    transparent 10px
  );
}

.subtopic-row:last-child .marker-line {
  display: none;
}

.row-card {
  border: 1px solid var(--divider, #e2e8f0);
  border-radius: 14px;
  padding: 10px;
  background: var(--bg-primary, #ffffff);
  display: grid;
  grid-template-columns: 52px 1fr auto;
  gap: 10px;
  align-items: center;
}

.row-card__thumb {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #1e3a8a;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.row-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.row-description {
  margin-top: 3px;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
}

.row-card__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.row-btn {
  min-height: 34px;
  padding: 6px 10px;
  font-size: 13px;
}

.state-completed .marker-dot,
.state-completed .row-card__thumb {
  background: #d1fae5;
  color: #047857;
}

.state-completed_locked .marker-dot,
.state-locked .marker-dot,
.state-completed_locked .row-card__thumb,
.state-locked .row-card__thumb {
  background: #e5e7eb;
  color: #6b7280;
}

@media (max-width: 640px) {
  .row-card {
    grid-template-columns: 46px 1fr;
  }

  .row-card__actions {
    grid-column: 2 / 3;
    align-items: stretch;
  }

  .row-btn {
    width: 100%;
  }
}
</style>
