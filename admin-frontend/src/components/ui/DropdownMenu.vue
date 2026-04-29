<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger as-child>
      <slot name="trigger">
        <button
          class="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none"
        >
          <Icon name="MoreHorizontal" :size="16" />
        </button>
      </slot>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        class="z-[9999] min-w-[180px] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg p-1"
      >
        <template v-if="items.length">
          <template v-for="(item, index) in items" :key="index">
            <DropdownMenuSeparator v-if="item.separator" class="my-1 h-px bg-border -mx-1" />
            <DropdownMenuLabel v-else-if="item.isLabel" class="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {{ item.label }}
            </DropdownMenuLabel>
            <DropdownMenuItem
              v-else
              :disabled="item.disabled"
              :class="[
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer select-none outline-none',
                item.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-accent focus:bg-accent',
                item.variant === 'danger' ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10' : 'text-foreground',
              ]"
              @select="item.action?.()"
            >
              <Icon v-if="item.icon" :name="item.icon" :size="15" class="shrink-0" />
              <span class="truncate">{{ item.label }}</span>
            </DropdownMenuItem>
          </template>
        </template>

        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup>
import { ref } from "vue";
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "reka-ui";
import Icon from "./Icon.vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  side: {
    type: String,
    default: "bottom",
    validator: (v) => ["top", "bottom", "left", "right"].includes(v),
  },
  align: {
    type: String,
    default: "end",
    validator: (v) => ["start", "center", "end"].includes(v),
  },
  sideOffset: {
    type: Number,
    default: 4,
  },
});

const open = ref(false);
</script>
