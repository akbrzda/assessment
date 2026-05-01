<template>
  <button :type="type" :disabled="disabled || loading" :aria-label="resolvedAriaLabel" :class="classes" @click="handleClick">
    <span v-if="loading" class="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" :class="spinnerSize" />
    <Icon v-else-if="resolvedIconLeft" :name="resolvedIconLeft" :size="iconSize" />
    <span v-if="$slots.default && !iconOnly" class="btn-label"><slot /></span>
    <Icon v-if="resolvedIconRight && !loading" :name="resolvedIconRight" :size="iconSize" />
  </button>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const props = defineProps({
  icon: String,
  iconLeft: String,
  iconRight: String,
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary", "tertiary", "danger", "success", "ghost", "outline", "link"].includes(value),
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
  ariaLabel: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["click"]);

const variantClasses = {
  primary:
    "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[var(--elevation-soft)] hover:translate-y-[-1px] hover:shadow-[var(--elevation-float)] active:translate-y-0 active:brightness-95 focus-visible:shadow-[var(--focus-ring)]",
  secondary:
    "bg-secondary/75 text-foreground border border-border/90 shadow-[var(--elevation-soft)] hover:translate-y-[-1px] hover:border-ring/35 hover:bg-accent/80 active:translate-y-0 active:bg-accent focus-visible:shadow-[var(--focus-ring)]",
  tertiary:
    "bg-transparent text-primary border border-primary/45 hover:bg-primary/10 hover:border-primary/70 active:bg-primary/15 focus-visible:shadow-[var(--focus-ring)]",
  danger:
    "bg-gradient-to-b from-destructive to-destructive/90 text-destructive-foreground shadow-[var(--elevation-soft)] hover:translate-y-[-1px] hover:shadow-[var(--elevation-float)] active:translate-y-0 active:brightness-95 focus-visible:shadow-[var(--focus-ring)]",
  success:
    "bg-gradient-to-b from-accent-green to-accent-green/90 text-white shadow-[var(--elevation-soft)] hover:translate-y-[-1px] hover:shadow-[var(--elevation-float)] active:translate-y-0 active:brightness-95 focus-visible:shadow-[var(--focus-ring)]",
  ghost:
    "bg-transparent text-foreground border border-transparent hover:border-border hover:bg-accent/65 active:bg-accent focus-visible:shadow-[var(--focus-ring)]",
  outline:
    "bg-transparent text-foreground border border-border shadow-[var(--elevation-soft)] hover:bg-accent/60 hover:border-ring/40 active:bg-accent focus-visible:shadow-[var(--focus-ring)]",
  link: "bg-transparent text-primary border border-transparent shadow-none hover:text-primary/80 hover:underline active:text-primary/90 focus-visible:shadow-[var(--focus-ring)]",
};

const sizeClasses = computed(() => {
  if (props.iconOnly) {
    return { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" }[props.size];
  }
  return { sm: "h-8 px-3 text-sm gap-2", md: "h-10 px-4 text-[15px] gap-2", lg: "h-12 px-5 text-base gap-2" }[props.size];
});

const iconSize = computed(() => ({ sm: 14, md: 16, lg: 18 })[props.size]);
const spinnerSize = computed(() => ({ sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" })[props.size]);
const resolvedIconLeft = computed(() => props.iconLeft || props.icon || "");
const resolvedIconRight = computed(() => (props.iconLeft || props.icon ? props.iconRight || "" : props.iconRight || ""));
const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel) {
    return props.ariaLabel;
  }
  if (props.iconOnly) {
    return "Кнопка действия";
  }
  return undefined;
});

const classes = computed(() =>
  cn(
    "inline-flex items-center justify-center font-semibold rounded-[var(--radius-md)] transition-all duration-150 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
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
