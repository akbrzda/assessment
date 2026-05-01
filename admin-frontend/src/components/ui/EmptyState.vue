<template>
  <div :class="cn('rounded-xl border border-dashed border-border bg-muted/55 text-center text-muted-foreground', sizeClass)">
    <div class="mb-4 flex justify-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/85 shadow-[var(--elevation-soft)]">
        <component :is="resolvedIcon" :class="iconClass" />
      </div>
    </div>
    <h3 class="mb-2 text-lg font-semibold text-foreground">{{ title }}</h3>
    <p class="mx-auto mb-2 max-w-[400px] text-sm leading-relaxed text-muted-foreground">{{ description }}</p>
    <p v-if="hint" class="mx-auto mb-6 max-w-[420px] text-xs text-muted-foreground/90">
      {{ hint }}
    </p>
    <Button v-if="showButton" :variant="buttonVariant" @click="$emit('action')">
      {{ buttonText }}
    </Button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import * as LucideIcons from "lucide-vue-next";
import { cn } from "@/lib/utils";
import Button from "./Button.vue";

const props = defineProps({
  title: {
    type: String,
    default: "Нет данных",
  },
  description: {
    type: String,
    default: "Здесь пока ничего нет. Попробуйте создать новый элемент.",
  },
  hint: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "Inbox",
  },
  showButton: {
    type: Boolean,
    default: false,
  },
  buttonText: {
    type: String,
    default: "Создать",
  },
  buttonVariant: {
    type: String,
    default: "primary",
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

defineEmits(["action"]);

const sizeMap = { sm: "py-10 px-5", md: "py-16 px-5", lg: "py-20 px-5" };
const iconSizeMap = { sm: "h-10 w-10", md: "h-12 w-12", lg: "h-16 w-16" };

const sizeClass = computed(() => sizeMap[props.size]);
const iconClass = computed(() => cn(iconSizeMap[props.size], "text-primary/70"));

const resolvedIcon = computed(() => {
  // Если передан emoji — используем дефолтную иконку
  if (/\p{Emoji}/u.test(props.icon)) return LucideIcons.Inbox;
  const normalized = props.icon.replace(/[-_\s]+(.)?/g, (_, g) => (g ? g.toUpperCase() : "")).replace(/^\w/, (m) => m.toUpperCase());
  return LucideIcons[normalized] || LucideIcons[`${normalized}Icon`] || LucideIcons.Inbox;
});
</script>
