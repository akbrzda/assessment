<template>
  <TabsRoot v-model="model" :class="rootClass">
    <TabsList
      :class="[
        'flex items-center gap-1',
        variant === 'underline'
          ? 'border-b border-border/80 bg-transparent'
          : 'rounded-[var(--radius-md)] border border-border/70 bg-muted/70 p-1 shadow-[var(--elevation-soft)]',
      ]"
    >
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        :disabled="tab.disabled"
        :class="[
          'inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40 disabled:cursor-not-allowed',
          variant === 'underline'
            ? [
                'px-3 py-2.5 border-b-2 -mb-px rounded-none',
                'border-transparent text-muted-foreground hover:text-foreground',
                'data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:translate-y-[1px]',
              ]
            : [
                'px-4 py-1.5 rounded-[10px]',
                'text-muted-foreground hover:text-foreground',
                'data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-[var(--elevation-soft)]',
              ],
        ]"
      >
        <Icon v-if="tab.icon" :name="tab.icon" :size="14" />
        {{ tab.label }}
        <Badge v-if="tab.badge != null" variant="default" size="sm">{{ tab.badge }}</Badge>
      </TabsTrigger>
    </TabsList>

    <div v-if="!headOnly" class="mt-4">
      <TabsContent v-for="tab in tabs" :key="tab.value" :value="tab.value" class="focus:outline-none">
        <slot :name="tab.value" />
      </TabsContent>
      <slot />
    </div>
  </TabsRoot>
</template>

<script setup>
import { computed } from "vue";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "reka-ui";
import Icon from "./Icon.vue";
import Badge from "./Badge.vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: undefined,
  },
  tabs: {
    type: Array,
    default: () => [],
  },
  variant: {
    type: String,
    default: "pills",
    validator: (v) => ["pills", "underline"].includes(v),
  },
  fullWidth: Boolean,
  headOnly: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => props.modelValue ?? props.tabs[0]?.value,
  set: (v) => emit("update:modelValue", v),
});

const rootClass = computed(() => (props.fullWidth ? "w-full" : ""));
</script>
