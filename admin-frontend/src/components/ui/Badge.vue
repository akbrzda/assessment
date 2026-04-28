<template>
  <span :class="cn(badgeBase, variantClasses[variant], sizeClasses[size])">
    <slot />
  </span>
</template>

<script setup>
import { cn } from "@/lib/utils";

defineProps({
  variant: {
    type: String,
    default: "default",
    validator: (value) => ["default", "secondary", "primary", "success", "warning", "danger", "info"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

const badgeBase = "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap";

const variantClasses = {
  default: "bg-muted text-foreground",
  secondary: "bg-muted text-muted-foreground border border-border",
  primary: "bg-accent-blue text-white",
  success: "bg-accent-green text-white",
  warning: "bg-accent-orange text-white",
  danger: "bg-red-500 text-white",
  info: "bg-accent-purple text-white",
};

const sizeClasses = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
  lg: "px-4 py-2 text-[15px]",
};
</script>
