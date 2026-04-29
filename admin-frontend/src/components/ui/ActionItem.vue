<template>
  <button
    :disabled="disabled"
    :class="[
      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
      'focus:outline-none cursor-pointer border-none bg-transparent text-left',
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent',
      variantClass,
    ]"
    @click="!disabled && emit('click')"
  >
    <Icon v-if="icon" :name="icon" :size="15" class="shrink-0" />
    <span class="truncate"><slot /></span>
  </button>
</template>

<script setup>
import { computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  icon: String,
  variant: {
    type: String,
    default: "default",
    validator: (v) => ["default", "danger"].includes(v),
  },
  disabled: Boolean,
});

const emit = defineEmits(["click"]);

const variantClass = computed(
  () =>
    ({
      default: "text-foreground",
      danger: "text-destructive hover:bg-destructive/10",
    })[props.variant],
);
</script>
