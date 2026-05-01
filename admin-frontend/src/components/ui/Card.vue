<template>
  <div
    :class="
      cn(
        'rounded-xl border border-border/90 bg-card text-card-foreground shadow-[var(--elevation-soft)] transition-[transform,box-shadow,border-color] duration-[var(--motion-base)]',
        hoverable &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-ring/45 hover:shadow-[var(--elevation-float)] focus-within:-translate-y-0.5 focus-within:border-ring/45 focus-within:shadow-[var(--elevation-float)]',
      )
    "
  >
    <div v-if="title || $slots.header" class="flex items-center gap-3 border-b border-border bg-muted/35 px-5 py-4">
      <slot name="header">
        <h3 class="text-sm font-semibold leading-none text-foreground">{{ title }}</h3>
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
