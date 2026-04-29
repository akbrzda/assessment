<template>
  <div v-if="!dismissed" :class="['flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', variantClass]">
    <Icon :name="iconName" :size="16" class="mt-0.5 shrink-0" />
    <div class="flex-1 min-w-0">
      <p v-if="title" class="font-semibold mb-0.5">{{ title }}</p>
      <p class="leading-relaxed"><slot /></p>
    </div>
    <button
      v-if="dismissible"
      class="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
      :class="closeButtonClass"
      @click="dismissed = true"
    >
      <Icon name="X" :size="14" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  variant: {
    type: String,
    default: "info",
    validator: (v) => ["info", "warning", "success", "danger", "system"].includes(v),
  },
  title: String,
  dismissible: Boolean,
});

const dismissed = ref(false);

const variants = {
  info: {
    class: "bg-accent-blue-soft border-accent-blue/30 text-accent-blue",
    icon: "Info",
    close: "text-accent-blue",
  },
  warning: {
    class: "bg-accent-orange-soft border-accent-orange/30 text-accent-orange",
    icon: "TriangleAlert",
    close: "text-accent-orange",
  },
  success: {
    class: "bg-accent-green-soft border-accent-green/30 text-accent-green",
    icon: "CircleCheck",
    close: "text-accent-green",
  },
  danger: {
    class: "bg-destructive/10 border-destructive/30 text-destructive",
    icon: "CircleX",
    close: "text-destructive",
  },
  system: {
    class: "bg-accent-blue-soft border-accent-blue/30 text-foreground",
    icon: "Info",
    close: "text-foreground",
  },
};

const variantClass = computed(() => variants[props.variant]?.class);
const iconName = computed(() => variants[props.variant]?.icon ?? "Info");
const closeButtonClass = computed(() => variants[props.variant]?.close);
</script>
