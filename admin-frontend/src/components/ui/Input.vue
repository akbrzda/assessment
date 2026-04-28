<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" class="text-sm font-medium text-foreground leading-none">
      {{ props.label }}
      <span v-if="props.required" class="text-destructive ml-0.5">*</span>
    </label>
    <div class="relative flex items-center">
      <div v-if="$slots.prefix" class="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
        <slot name="prefix" />
      </div>
      <input
        :value="props.modelValue"
        :type="props.type"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :min="props.min"
        :max="props.max"
        :class="
          cn(
            'flex w-full rounded-xl border border-input bg-background text-sm text-foreground shadow-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'read-only:bg-muted read-only:cursor-default',
            props.error && 'border-destructive focus:ring-destructive/30',
            sizeClass,
            $slots.prefix && 'pl-9',
            $slots.suffix && 'pr-9',
          )
        "
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <div v-if="$slots.suffix" class="absolute right-3 flex items-center text-muted-foreground">
        <slot name="suffix" />
      </div>
    </div>
    <p v-if="props.error" class="text-xs text-destructive">{{ props.error }}</p>
    <p v-else-if="props.hint" class="text-xs text-muted-foreground">{{ props.hint }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: String,
  type: { type: String, default: "text" },
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

defineEmits(["update:modelValue"]);

const sizeClass = computed(() => ({ sm: "h-8 px-3 text-xs", md: "h-9 px-3", lg: "h-10 px-4 text-base" })[props.size]);
</script>