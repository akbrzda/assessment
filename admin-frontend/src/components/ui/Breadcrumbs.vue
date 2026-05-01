<template>
  <nav
    aria-label="Навигация"
    class="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-muted/35 px-2.5 py-1.5 text-sm text-muted-foreground"
  >
    <template v-for="(item, index) in visibleItems" :key="index">
      <span v-if="index > 0" class="select-none text-muted-foreground/50">
        <Icon name="ChevronRight" :size="14" />
      </span>

      <span v-if="item === '...'" class="cursor-default select-none px-1 text-muted-foreground/60">…</span>

      <router-link
        v-else-if="item.to && index < visibleItems.length - 1"
        :to="item.to"
        class="max-w-[140px] truncate rounded-md px-1.5 py-0.5 transition-colors duration-150 hover:bg-accent/40 hover:text-foreground"
        >{{ item.label }}</router-link
      >

      <span
        v-else
        class="max-w-[200px] truncate rounded-md bg-background px-2 py-0.5 font-semibold text-foreground"
        :aria-current="index === visibleItems.length - 1 ? 'page' : undefined"
        >{{ item.label }}</span
      >
    </template>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  maxItems: {
    type: Number,
    default: 0,
  },
});

const visibleItems = computed(() => {
  const items = props.items;
  if (!props.maxItems || items.length <= props.maxItems) return items;
  // Оставляем первый и последние (maxItems-1) элементов, между ними — «...»
  const tail = props.maxItems - 1;
  return [items[0], "...", ...items.slice(items.length - tail)];
});
</script>
