<template>
  <div
    :class="
      cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        hoverable && 'cursor-pointer transition hover:shadow-md hover:border-ring/50',
      )
    "
  >
    <div v-if="title || $slots.header" class="flex items-center gap-3 px-5 py-4 border-b border-border">
      <slot name="header">
        <h3 class="text-sm font-semibold text-foreground leading-none">{{ title }}</h3>
      </slot>
    </div>
    <div :class="paddingClass">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-5 py-4 border-t border-border">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps({
  title: String,
  icon: String,
  padding: {
    type: String,
    default: "sm",
    validator: (v) => ["none", "sm", "md", "lg"].includes(v),
  },
  hoverable: Boolean,
  noPadding: Boolean,
});

const paddingMap = { none: "p-0", sm: "p-5", md: "p-6", lg: "p-8" };
const paddingClass = computed(() => (props.noPadding ? "p-0" : paddingMap[props.padding]));
</script>
