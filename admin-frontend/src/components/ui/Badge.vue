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
    validator: (value) =>
      [
        "default",
        "secondary",
        "outline",
        "primary",
        "success",
        "warning",
        "danger",
        "info",
        // Статусные варианты
        "new",
        "popular",
        "draft",
        "pending",
        "published",
        "archived",
        "error",
        "important",
      ].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

const badgeBase = "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap";

const variantClasses = {
  // Базовые
  default: "bg-muted text-foreground",
  secondary: "bg-muted text-muted-foreground",
  outline: "bg-transparent text-foreground border border-border",
  primary: "bg-accent-blue text-white",
  success: "bg-accent-green text-white",
  warning: "bg-accent-orange text-white",
  danger: "bg-destructive text-destructive-foreground",
  info: "bg-accent-blue-soft text-accent-blue border border-accent-blue/30",
  // Статусные (соответствуют UI Kit)
  new: "bg-accent-green text-white",
  popular: "bg-transparent text-accent-blue border border-accent-blue",
  draft: "bg-muted text-muted-foreground border border-border",
  pending: "bg-accent-orange text-white",
  published: "bg-accent-green-soft text-accent-green border border-accent-green/30",
  archived: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive border border-destructive/30",
  important: "bg-accent-orange-soft text-accent-orange border border-accent-orange/30",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};
</script>
