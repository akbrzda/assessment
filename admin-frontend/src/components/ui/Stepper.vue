<template>
  <div class="flex items-center w-full">
    <template v-for="(step, index) in steps" :key="index">
      <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div class="flex items-center w-full">
          <div v-if="index > 0" :class="['flex-1 h-0.5 transition-colors duration-300', index <= currentIndex ? 'bg-primary' : 'bg-border']" />
          <div
            :class="[
              'flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-300 shrink-0',
              stepSizeClass,
              index < currentIndex
                ? 'bg-primary text-primary-foreground'
                : index === currentIndex
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground border border-border',
            ]"
          >
            <Icon v-if="index < currentIndex" name="Check" :size="12" />
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div
            v-if="index < steps.length - 1"
            :class="['flex-1 h-0.5 transition-colors duration-300', index < currentIndex ? 'bg-primary' : 'bg-border']"
          />
        </div>
        <span
          :class="[
            'text-xs text-center leading-tight truncate max-w-full px-1',
            index === currentIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
          ]"
          >{{ step.label }}</span
        >
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  steps: {
    type: Array,
    default: () => [],
  },
  current: {
    type: Number,
    default: 0,
  },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

const currentIndex = computed(() => props.current);

const stepSizeClass = computed(
  () =>
    ({
      sm: "w-6 h-6",
      md: "w-8 h-8",
      lg: "w-10 h-10 text-sm",
    })[props.size],
);
</script>
