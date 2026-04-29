<template>
  <button :type="type" :disabled="disabled || loading" :class="classes" @click="handleClick">
    <span v-if="loading" class="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" :class="spinnerSize" />
    <Icon v-if="icon && !loading" :name="icon" :size="iconSize" />
    <span v-if="$slots.default && !iconOnly"><slot /></span>
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
    validator: (value) => ["primary", "secondary", "tertiary", "danger", "success", "ghost"].includes(value),
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
  iconOnly: Boolean,
});

const emit = defineEmits(["click"]);

const variantClasses = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80",
  secondary: "bg-muted text-foreground border border-border hover:bg-accent/60 active:bg-accent",
  tertiary: "bg-transparent text-primary border border-primary hover:bg-primary/10 active:bg-primary/20",
  danger: "bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80",
  success: "bg-accent-green text-white hover:opacity-90 active:opacity-80",
  ghost: "bg-transparent text-foreground hover:bg-accent/60 active:bg-accent",
};

const sizeClasses = computed(() => {
  if (props.iconOnly) {
    return { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-10 w-10" }[props.size];
  }
  return { sm: "px-4 py-2 text-sm gap-1.5", md: "px-5 py-2.5 text-[15px] gap-2", lg: "px-6 py-3 text-base gap-2" }[props.size];
});

const iconSize = computed(() => ({ sm: 14, md: 16, lg: 18 })[props.size]);
const spinnerSize = computed(() => ({ sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" })[props.size]);

const classes = computed(() =>
  cn(
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer border-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
    variantClasses[props.variant],
    sizeClasses.value,
    props.fullWidth && "w-full",
  ),
);

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
};
</script>
