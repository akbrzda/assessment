<template>
  <nav aria-label="Навигация" class="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
    <template v-for="(item, index) in visibleItems" :key="index">
      <span v-if="index > 0" class="text-muted-foreground/50 select-none">
        <Icon name="ChevronRight" :size="14" />
      </span>

      <span v-if="item === '...'" class="px-1 text-muted-foreground/60 cursor-default select-none">…</span>

      <router-link
        v-else-if="item.to && index < visibleItems.length - 1"
        :to="item.to"
        class="hover:text-foreground transition-colors duration-150 truncate max-w-[140px]"
        >{{ item.label }}</router-link
      >

      <span
        v-else
        class="text-foreground font-medium truncate max-w-[200px]"
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
