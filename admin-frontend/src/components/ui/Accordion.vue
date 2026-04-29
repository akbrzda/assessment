<template>
  <AccordionRoot
    v-model="model"
    :type="multiple ? 'multiple' : 'single'"
    :collapsible="collapsible"
    class="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden"
  >
    <AccordionItem v-for="item in items" :key="item.value" :value="item.value" :disabled="item.disabled" class="bg-card">
      <AccordionTrigger
        :class="[
          'flex w-full items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-foreground',
          'hover:bg-accent/40 transition-colors duration-150 focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&[data-state=open]>svg]:rotate-180',
        ]"
      >
        <div class="flex items-center gap-2 text-left">
          <Icon v-if="item.icon" :name="item.icon" :size="16" class="text-muted-foreground shrink-0" />
          <span>{{ item.label }}</span>
        </div>
        <Icon name="ChevronDown" :size="16" class="text-muted-foreground shrink-0 transition-transform duration-200" />
      </AccordionTrigger>
      <AccordionContent class="overflow-hidden">
        <div class="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          <slot :name="item.value">{{ item.content }}</slot>
        </div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>

<script setup>
import { computed } from "vue";
import { AccordionRoot, AccordionItem, AccordionTrigger, AccordionContent } from "reka-ui";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: {
    type: [String, Array],
    default: undefined,
  },
  items: {
    type: Array,
    default: () => [],
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  collapsible: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});
</script>
