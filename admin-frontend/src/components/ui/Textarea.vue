<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="flex items-center gap-1 text-[15px] font-medium text-foreground">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :class="
        cn(
          'min-h-24 w-full border border-border rounded-xl bg-background text-foreground resize-vertical transition-all duration-200',
          'placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
          sizeClass,
        )
      "
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: String,
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  rows: {
    type: Number,
    default: 3,
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

defineEmits(["update:modelValue"]);

const sizeClass = computed(() => ({ sm: "py-2 px-3 text-sm", md: "py-2.5 px-4 text-[15px]", lg: "py-3 px-5 text-base" })[props.size]);
</script>
