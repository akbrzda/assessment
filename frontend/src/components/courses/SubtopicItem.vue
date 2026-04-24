<template>
  <button class="subtopic-item" :class="`state-${resolvedState}`" type="button" @click="handleOpen">
    <span class="subtopic-index">{{ numberLabel }}</span>
    <div class="subtopic-body">
      <h4 class="subtopic-title">{{ topic.title }}</h4>
      <p v-if="lockDescriptionText" class="subtopic-description">{{ lockDescriptionText }}</p>
    </div>
    <span class="subtopic-state">
      <CheckCircle2 v-if="resolvedState === 'completed'" class="icon-completed" :size="22" :stroke-width="2" />
      <Circle v-else-if="resolvedState === 'in_progress'" class="icon-in-progress" :size="22" :stroke-width="1.5" />
      <Lock v-else-if="resolvedState === 'locked' || resolvedState === 'completed_locked'" class="icon-locked" :size="18" :stroke-width="1.5" />
      <Circle v-else class="icon-not-started" :size="22" :stroke-width="1.5" />
    </span>
  </button>
</template>

<script>
import { computed } from "vue";
import { CheckCircle2, Circle, Lock } from "lucide-vue-next";

export default {
  name: "SubtopicItem",
  components: { CheckCircle2, Circle, Lock },
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
    sectionOrderIndex: {
      type: Number,
      default: null,
    },
  },
  setup(props, { emit }) {
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

    const lockDescriptionText = computed(() => {
      if (resolvedState.value === "completed_locked" || resolvedState.value === "locked") {
        return props.topic?.progress?.lockReasonText || "Сначала завершите предыдущую подтему";
      }
      return null;
    });

    const numberLabel = computed(() => {
      const topicNum = Number(props.topic?.orderIndex || props.index + 1);
      const sectionNum = props.sectionOrderIndex != null ? Number(props.sectionOrderIndex) : null;
      if (sectionNum != null && Number.isFinite(sectionNum) && Number.isFinite(topicNum)) {
        return `${sectionNum}.${topicNum}`;
      }
      return Number.isFinite(topicNum) ? String(topicNum) : `${props.index + 1}`;
    });

    function handleOpen() {
      if (canOpen.value) {
        emit("open", props.topic);
        return;
      }
      emit("lock-click", props.topic);
    }

    return {
      resolvedState,
      lockDescriptionText,
      numberLabel,
      handleOpen,
    };
  },
};
</script>

<style scoped>
.subtopic-item {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 14px;
  background: var(--bg-primary);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
  transition: background 0.15s;
}

.subtopic-index {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 28px;
}

.subtopic-title {
  margin: 0;
  font-size: 15px;
  font-weight: 400;
  color: var(--text-primary);
}

.subtopic-description {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
}

.subtopic-state {
  width: 24px;
  height: 24px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.state-in_progress {
  background: color-mix(in srgb, #5856d6 8%, var(--bg-primary) 92%);
  border-color: color-mix(in srgb, #5856d6 30%, var(--divider) 70%);
}

.state-in_progress .subtopic-index {
  color: #5856d6;
  font-weight: 600;
}

.state-in_progress .subtopic-title {
  font-weight: 500;
}

.state-locked .subtopic-title,
.state-completed_locked .subtopic-title {
  color: var(--text-secondary);
}

.state-locked .subtopic-index,
.state-completed_locked .subtopic-index {
  color: var(--text-secondary);
}

.icon-completed {
  color: #34c759;
}

.icon-in-progress {
  color: #5856d6;
}

.icon-locked {
  color: #8e8e93;
}

.icon-not-started {
  color: #c7c7cc;
}
</style>
