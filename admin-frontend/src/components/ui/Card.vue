<template>
  <div
    :class="
      cn(
        'bg-background rounded-lg border border-border overflow-hidden transition-all duration-200',
        hoverable && 'cursor-pointer hover:border-accent-blue hover:shadow',
      )
    "
  >
    <div v-if="title || $slots.header" class="px-4 py-3 border-b border-border bg-muted">
      <slot name="header">
        <div class="flex items-center gap-3">
          <Icon v-if="icon" :name="icon" :size="20" class="shrink-0 text-foreground" />
          <h3 class="text-base font-semibold text-foreground m-0 leading-normal">{{ title }}</h3>
        </div>
      </slot>
    </div>
    <div :class="paddingClass">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-4 py-3 border-t border-border bg-muted">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const props = defineProps({
  title: String,
  icon: String,
  padding: {
    type: String,
    default: "sm",
    validator: (value) => ["none", "sm", "md", "lg"].includes(value),
  },
  hoverable: Boolean,
  noPadding: Boolean,
});

const paddingMap = { none: "p-0", sm: "p-4", md: "p-5", lg: "p-6" };
const paddingClass = computed(() => (props.noPadding ? "p-0" : paddingMap[props.padding]));
</script>
