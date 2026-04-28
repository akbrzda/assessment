<template>
  <div :class="cn('text-center bg-muted rounded-xl text-muted-foreground', sizeClass)">
    <div class="flex justify-center mb-4">
      <component :is="resolvedIcon" :class="iconClass" />
    </div>
    <h3 class="text-lg font-semibold mb-2 text-foreground">{{ title }}</h3>
    <p class="text-sm text-muted-foreground max-w-[400px] mx-auto leading-relaxed mb-6">{{ description }}</p>
    <Button v-if="showButton" @click="$emit('action')" :variant="buttonVariant">
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
const iconClass = computed(() => cn(iconSizeMap[props.size], "text-muted-foreground opacity-50"));

const resolvedIcon = computed(() => {
  // Если передан emoji — используем дефолтную иконку
  if (/\p{Emoji}/u.test(props.icon)) return LucideIcons.Inbox;
  const normalized = props.icon.replace(/[-_\s]+(.)?/g, (_, g) => (g ? g.toUpperCase() : "")).replace(/^\w/, (m) => m.toUpperCase());
  return LucideIcons[normalized] || LucideIcons[`${normalized}Icon`] || LucideIcons.Inbox;
});
</script>
