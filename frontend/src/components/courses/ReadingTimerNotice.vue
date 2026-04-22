<template>
  <section class="reading-timer-notice" :class="stateClass">
    <div class="reading-timer-notice__head">
      <h3 class="title-small">Таймер чтения</h3>
      <span class="reading-timer-notice__time">{{ formattedRemaining }}</span>
    </div>
    <p class="body-small text-secondary mb-8">
      {{ descriptionText }}
    </p>
    <div class="reading-timer-notice__progress" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
      <div class="reading-timer-notice__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
    </div>
  </section>
</template>

<script>
import { computed } from "vue";
import { formatReadingTime } from "../../utils/readingTime";

export default {
  name: "ReadingTimerNotice",
  props: {
    remainingSeconds: {
      type: Number,
      default: 0,
    },
    requiredSeconds: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const safeRequiredSeconds = computed(() => Math.max(0, Number(props.requiredSeconds || 0)));
    const safeRemainingSeconds = computed(() => Math.max(0, Number(props.remainingSeconds || 0)));

    const progressPercent = computed(() => {
      if (!safeRequiredSeconds.value) {
        return 100;
      }
      const elapsed = Math.max(0, safeRequiredSeconds.value - safeRemainingSeconds.value);
      return Math.max(0, Math.min(100, Math.round((elapsed / safeRequiredSeconds.value) * 100)));
    });

    const formattedRemaining = computed(() => {
      if (props.completed) {
        return "Готово";
      }
      return formatReadingTime(safeRemainingSeconds.value);
    });

    const descriptionText = computed(() => {
      if (props.completed) {
        return "Минимальное время чтения выполнено. Можно перейти к следующему шагу.";
      }
      if (!safeRequiredSeconds.value) {
        return "Минимальное время чтения не требуется для этой подтемы.";
      }
      return `До завершения материала осталось ${formatReadingTime(safeRemainingSeconds.value)}.`;
    });

    const stateClass = computed(() => {
      if (props.completed) {
        return "is-completed";
      }
      if (safeRemainingSeconds.value <= 10) {
        return "is-near-complete";
      }
      return "is-active";
    });

    return {
      progressPercent,
      formattedRemaining,
      descriptionText,
      stateClass,
    };
  },
};
</script>

<style scoped>
.reading-timer-notice {
  border: 1px solid rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.07);
  border-radius: 12px;
  padding: 12px;
}

.reading-timer-notice.is-completed {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.08);
}

.reading-timer-notice.is-near-complete {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.08);
}

.reading-timer-notice__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reading-timer-notice__time {
  font-size: 13px;
  font-weight: 700;
}

.reading-timer-notice__progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
}

.reading-timer-notice__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%);
  transition: width 0.3s ease;
}
</style>
