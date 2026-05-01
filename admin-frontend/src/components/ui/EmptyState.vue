<template>
  <div :class="cn('rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/40 text-center', sizeClass)">
    <div class="mb-4 flex justify-center">
      <div
        class="flex items-center justify-center rounded-2xl bg-background/85"
        :style="{ boxShadow: 'var(--elevation-soft)', width: '64px', height: '64px' }"
      >
        <component :is="resolvedIcon" :class="iconClass" />
      </div>
    </div>

    <h3 class="mb-2 text-base font-semibold text-foreground">{{ computedTitle }}</h3>
    <p class="mx-auto mb-2 max-w-[380px] text-sm leading-relaxed text-muted-foreground">{{ computedDescription }}</p>
    <p v-if="computedHint" class="mx-auto mb-6 max-w-[420px] text-xs text-muted-foreground/75">
      {{ computedHint }}
    </p>
    <div v-else class="mb-6" />

    <div class="flex items-center justify-center gap-3 flex-wrap">
      <Button v-if="showButton" :variant="buttonVariant" @click="$emit('action')">
        <Icon v-if="buttonIcon" :name="buttonIcon" :size="15" />
        {{ buttonText }}
      </Button>
      <Button v-if="showSecondaryButton" variant="ghost" @click="$emit('secondary-action')">
        {{ secondaryButtonText }}
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import * as LucideIcons from "lucide-vue-next";
import { cn } from "@/lib/utils";
import Button from "./Button.vue";
import Icon from "./Icon.vue";

// Пресеты по типу причины пустого состояния
const TYPE_PRESETS = {
  "first-time": {
    icon: "Inbox",
    defaultTitle: "Здесь пока ничего нет",
    defaultDescription: "Создайте первый элемент, чтобы начать работу.",
    buttonVariant: "primary",
  },
  filter: {
    icon: "SearchX",
    defaultTitle: "Ничего не найдено",
    defaultDescription: "Попробуйте изменить параметры фильтрации или поиска.",
    buttonVariant: "secondary",
  },
  error: {
    icon: "ServerCrash",
    defaultTitle: "Не удалось загрузить данные",
    defaultDescription: "Произошла ошибка при загрузке. Попробуйте обновить страницу.",
    buttonVariant: "secondary",
  },
  permission: {
    icon: "Lock",
    defaultTitle: "Раздел недоступен",
    defaultDescription: "У вашей роли нет доступа к этим данным.",
    buttonVariant: "secondary",
  },
  custom: {
    icon: "Inbox",
    defaultTitle: "Нет данных",
    defaultDescription: "Здесь пока ничего нет.",
    buttonVariant: "primary",
  },
};

const props = defineProps({
  // Тип причины пустого состояния — определяет дефолтные иконку, текст, CTA
  type: {
    type: String,
    default: "custom",
    validator: (v) => ["first-time", "filter", "error", "permission", "custom"].includes(v),
  },
  title: String,
  description: String,
  hint: String,
  icon: String,
  showButton: {
    type: Boolean,
    default: false,
  },
  buttonText: {
    type: String,
    default: "Создать",
  },
  buttonIcon: String,
  buttonVariant: String,
  showSecondaryButton: {
    type: Boolean,
    default: false,
  },
  secondaryButtonText: {
    type: String,
    default: "Отмена",
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

defineEmits(["action", "secondary-action"]);

const preset = computed(() => TYPE_PRESETS[props.type] ?? TYPE_PRESETS.custom);

const computedTitle = computed(() => props.title ?? preset.value.defaultTitle);
const computedDescription = computed(() => props.description ?? preset.value.defaultDescription);
const computedHint = computed(() => props.hint ?? "");

const sizeMap = { sm: "py-10 px-5", md: "py-16 px-5", lg: "py-20 px-5" };
const iconSizeMap = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };

const sizeClass = computed(() => sizeMap[props.size]);
const iconClass = computed(() => cn(iconSizeMap[props.size], "text-primary/60"));

const buttonVariant = computed(() => props.buttonVariant ?? preset.value.buttonVariant);

const resolvedIcon = computed(() => {
  const iconName = props.icon ?? preset.value.icon;
  if (/\p{Emoji}/u.test(iconName)) return LucideIcons.Inbox;
  const normalized = iconName.replace(/[-_\s]+(.)?/g, (_, g) => (g ? g.toUpperCase() : "")).replace(/^\w/, (m) => m.toUpperCase());
  return LucideIcons[normalized] || LucideIcons[`${normalized}Icon`] || LucideIcons.Inbox;
});
</script>
