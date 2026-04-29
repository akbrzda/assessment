<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <TagsInputRoot
      v-model="model"
      :disabled="disabled"
      :add-on-tab="true"
      :class="[
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5 text-sm shadow-sm cursor-text',
        'focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-colors',
        disabled ? 'cursor-not-allowed opacity-50 pointer-events-none' : '',
        error ? 'border-destructive focus-within:ring-destructive/30' : '',
        success && !error ? 'border-accent-green focus-within:ring-accent-green/30' : '',
      ]"
    >
      <TagsInputItem
        v-for="tag in model"
        :key="tag"
        :value="tag"
        :class="[
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
          error ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
        ]"
      >
        <TagsInputItemText />
        <TagsInputItemDelete class="ml-0.5 flex items-center opacity-60 hover:opacity-100 transition cursor-pointer bg-transparent border-none p-0">
          <Icon name="X" :size="11" />
        </TagsInputItemDelete>
      </TagsInputItem>

      <TagsInputInput
        :placeholder="placeholder"
        class="flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-0.5"
      />
    </TagsInputRoot>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="success" class="text-xs text-accent-green">{{ success }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputItemDelete, TagsInputInput } from "reka-ui";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: String,
  placeholder: { type: String, default: "Введите тег и нажмите Enter..." },
  error: String,
  success: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});
</script>
