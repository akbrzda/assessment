<template>
  <Button
    :variant="resolvedVariant"
    :size="size"
    :icon-left="resolvedIconLeft"
    :icon-right="iconRight"
    :loading="loading"
    :disabled="disabled"
    :type="type"
    :full-width="fullWidth"
    :icon-only="iconOnly"
    :aria-label="resolvedAriaLabel"
    :title="title || resolvedLabel"
    @click="$emit('click', $event)"
  >
    <slot>{{ resolvedLabel }}</slot>
  </Button>
</template>

<script setup>
import { computed } from "vue";
import Button from "./Button.vue";

const ACTION_CONFIG = {
  back: { label: "Назад", variant: "ghost", iconLeft: "arrow-left" },
  save: { label: "Сохранить", variant: "primary", iconLeft: "save" },
  create: { label: "Создать", variant: "primary", iconLeft: "plus" },
  submit: { label: "Подтвердить", variant: "primary", iconLeft: "check" },
  confirm: { label: "Подтвердить", variant: "primary", iconLeft: "check" },
  apply: { label: "Применить", variant: "primary", iconLeft: "check" },
  cancel: { label: "Отмена", variant: "secondary", iconLeft: "x" },
  close: { label: "Закрыть", variant: "ghost", iconLeft: "x" },
  delete: { label: "Удалить", variant: "danger", iconLeft: "trash" },
  edit: { label: "Редактировать", variant: "secondary", iconLeft: "pencil" },
  reset: { label: "Сбросить", variant: "ghost", iconLeft: "rotate-ccw" },
  export: { label: "Экспорт", variant: "secondary", iconLeft: "download" },
  import: { label: "Импорт", variant: "secondary", iconLeft: "upload" },
  archive: { label: "Архивировать", variant: "danger", iconLeft: "archive" },
  restore: { label: "Восстановить", variant: "primary", iconLeft: "undo-2" },
};

const props = defineProps({
  action: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "",
  },
  variant: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "md",
  },
  iconLeft: {
    type: String,
    default: "",
  },
  iconRight: {
    type: String,
    default: "",
  },
  loading: Boolean,
  disabled: Boolean,
  fullWidth: Boolean,
  iconOnly: Boolean,
  type: {
    type: String,
    default: "button",
  },
  title: {
    type: String,
    default: "",
  },
  ariaLabel: {
    type: String,
    default: "",
  },
});

defineEmits(["click"]);

const normalizedAction = computed(() => props.action.trim().toLowerCase());
const actionConfig = computed(() => ACTION_CONFIG[normalizedAction.value] || { label: "", variant: "secondary", iconLeft: "" });
const resolvedLabel = computed(() => props.label || actionConfig.value.label || "Действие");
const resolvedVariant = computed(() => props.variant || actionConfig.value.variant || "secondary");
const resolvedIconLeft = computed(() => props.iconLeft || actionConfig.value.iconLeft || "");
const resolvedAriaLabel = computed(() => props.ariaLabel || resolvedLabel.value);
</script>
