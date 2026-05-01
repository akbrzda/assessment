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

const badgeBase = "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap border";

const variantClasses = {
  // Базовые
  default: "bg-muted/70 text-foreground border-border/70",
  secondary: "bg-muted/55 text-muted-foreground border-border/65",
  outline: "bg-transparent text-foreground border-border/85",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-accent-green-soft text-accent-green border-accent-green/30",
  warning: "bg-accent-orange-soft text-accent-orange border-accent-orange/30",
  danger: "bg-destructive/12 text-destructive border-destructive/35",
  info: "bg-accent-blue-soft text-accent-blue border-accent-blue/30",
  // Статусные (соответствуют UI Kit)
  new: "bg-accent-green-soft text-accent-green border-accent-green/30",
  popular: "bg-transparent text-accent-blue border-accent-blue/45",
  draft: "bg-accent-blue-soft/60 text-accent-blue border-accent-blue/25",
  pending: "bg-accent-orange-soft text-accent-orange border-accent-orange/35",
  published: "bg-accent-green-soft text-accent-green border border-accent-green/30",
  archived: "bg-muted/65 text-muted-foreground border-border/65",
  error: "bg-destructive/10 text-destructive border border-destructive/30",
  important: "bg-accent-orange-soft text-accent-orange border border-accent-orange/30",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};
</script>
