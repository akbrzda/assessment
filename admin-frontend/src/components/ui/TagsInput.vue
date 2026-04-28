<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>
    <TagsInputRoot
      v-model="model"
      :disabled="disabled"
      :class="
        cn(
          'flex min-h-9 w-full flex-wrap gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm',
          'focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-within:ring-destructive/30',
        )
      "
    >
      <TagsInputItem
        v-for="tag in model"
        :key="tag"
        :value="tag"
        class="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
      >
        <TagsInputItemText />
        <TagsInputItemDelete class="ml-0.5 opacity-60 hover:opacity-100 transition cursor-pointer">
          <XIcon :size="11" />
        </TagsInputItemDelete>
      </TagsInputItem>
      <TagsInputInput
        :placeholder="model.length === 0 ? placeholder : ''"
        class="flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </TagsInputRoot>
    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputItemDelete, TagsInputInput } from "reka-ui";
import { X as XIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: String,
  placeholder: { type: String, default: "Добавить тег..." },
  error: String,
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
