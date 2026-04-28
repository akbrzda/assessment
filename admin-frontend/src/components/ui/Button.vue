<template>
  <button :type="type" :disabled="disabled || loading" :class="classes" @click="handleClick">
    <span v-if="loading" class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <Icon v-if="icon && !loading" :name="icon" :size="iconSize" />
    <span v-if="$slots.default"><slot /></span>
  </button>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const props = defineProps({
  icon: String,
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary", "danger", "success", "ghost"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
  type: {
    type: String,
    default: "button",
  },
  disabled: Boolean,
  loading: Boolean,
  fullWidth: Boolean,
});

const emit = defineEmits(["click"]);

const variantClasses = {
  primary: "bg-nav-active text-nav-active-text hover:opacity-90",
  secondary: "bg-muted text-foreground border border-border hover:bg-nav-hover",
  danger: "bg-red-500 text-white hover:bg-red-600",
  success: "bg-accent-green text-white hover:opacity-90",
  ghost: "bg-transparent text-foreground hover:bg-nav-hover",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm gap-1.5",
  md: "px-5 py-2.5 text-[15px] gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

const iconSize = computed(() => ({ sm: 14, md: 16, lg: 18 })[props.size]);

const classes = computed(() =>
  cn(
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer border-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
    variantClasses[props.variant],
    sizeClasses[props.size],
    props.fullWidth && "w-full",
  ),
);

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
};
</script>
