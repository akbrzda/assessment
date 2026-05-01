<template>
  <Transition name="alert">
    <div
      v-if="!dismissed"
      :class="['flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-sm', variantClass]"
      :style="{ borderLeftWidth: '3px', borderLeftColor: `hsl(var(--color-${semanticKey}-border))` }"
      role="alert"
      :aria-live="variant === 'danger' ? 'assertive' : 'polite'"
    >
      <Icon :name="iconName" :size="16" class="mt-0.5 shrink-0" :aria-hidden="true" />
      <div class="flex-1 min-w-0">
        <p v-if="title" :class="['font-semibold mb-0.5', titleWeightClass]">{{ title }}</p>
        <p class="leading-relaxed m-0"><slot /></p>
        <div v-if="$slots.actions" class="mt-2">
          <slot name="actions" />
        </div>
      </div>
      <button
        v-if="dismissible"
        class="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
        :class="closeButtonClass"
        aria-label="Закрыть"
        @click="dismissed = true"
      >
        <Icon name="X" :size="14" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  variant: {
    type: String,
    default: "info",
    validator: (v) => ["info", "warning", "success", "danger", "system"].includes(v),
  },
  title: String,
  dismissible: Boolean,
});

const dismissed = ref(false);

const variants = {
  info: {
    class: "bg-accent-blue-soft border-accent-blue/20 text-accent-blue",
    icon: "Info",
    close: "text-accent-blue",
    semantic: "info",
    titleWeight: "font-semibold",
  },
  warning: {
    class: "bg-accent-orange-soft border-accent-orange/20 text-accent-orange",
    icon: "TriangleAlert",
    close: "text-accent-orange",
    semantic: "warning",
    titleWeight: "font-semibold",
  },
  success: {
    class: "bg-accent-green-soft border-accent-green/20 text-accent-green",
    icon: "CircleCheck",
    close: "text-accent-green",
    semantic: "success",
    titleWeight: "font-semibold",
  },
  danger: {
    class: "bg-destructive/8 border-destructive/20 text-destructive",
    icon: "CircleX",
    close: "text-destructive",
    semantic: "danger",
    titleWeight: "font-bold",
  },
  system: {
    class: "bg-accent-blue-soft border-accent-blue/20 text-foreground",
    icon: "Info",
    close: "text-foreground",
    semantic: "info",
    titleWeight: "font-semibold",
  },
};

const variantClass = computed(() => variants[props.variant]?.class);
const iconName = computed(() => variants[props.variant]?.icon ?? "Info");
const closeButtonClass = computed(() => variants[props.variant]?.close);
const semanticKey = computed(() => variants[props.variant]?.semantic ?? "info");
const titleWeightClass = computed(() => variants[props.variant]?.titleWeight ?? "font-semibold");
</script>

<style scoped>
.alert-enter-active {
  animation: alert-enter var(--duration-normal) var(--ease-out-expo) forwards;
}
.alert-leave-active {
  transition:
    opacity var(--duration-fast) ease-in,
    transform var(--duration-fast) ease-in,
    max-height var(--duration-fast) ease-in;
  overflow: hidden;
}
.alert-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
