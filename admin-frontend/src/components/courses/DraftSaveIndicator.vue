<template>
  <div class="draft-indicator" :class="stateClass">
    <span class="dot"></span>
    <span class="label">{{ stateLabel }}</span>
    <span v-if="savedAtLabel" class="timestamp">{{ savedAtLabel }}</span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  state: {
    type: String,
    default: "saved",
  },
  savedAt: {
    type: [String, Date, null],
    default: null,
  },
});

const stateClass = computed(() => `state-${props.state || "saved"}`);

const stateLabel = computed(() => {
  if (props.state === "saving") return "Сохраняется";
  if (props.state === "error") return "Ошибка сохранения";
  return "Сохранено";
});

const savedAtLabel = computed(() => {
  if (!props.savedAt || props.state !== "saved") {
    return "";
  }
  const date = new Date(props.savedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
});
</script>

<style scoped>
.draft-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.timestamp {
  font-weight: 500;
  opacity: 0.8;
}

.state-saved {
  color: #15803d;
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.25);
}

.state-saving {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.25);
}

.state-error {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.25);
}
</style>
