<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5" @click="handleCancel">
        <div
          class="bg-muted rounded-xl p-6 max-w-[400px] w-full shadow-modal border border-border"
          style="animation: slideIn 0.3s ease-out"
          @click.stop
        >
          <div class="flex items-center gap-3 mb-4">
            <div :class="cn('flex items-center justify-center w-12 h-12 rounded-xl shrink-0', iconBgClass)">
              <Icon :name="iconName" :size="24" :stroke-width="2.25" aria-hidden="true" />
            </div>
            <h2 class="text-lg font-semibold text-foreground m-0">{{ title }}</h2>
          </div>

          <div class="mb-6">
            <p class="text-sm text-muted-foreground m-0 mb-3 leading-relaxed">{{ message }}</p>
            <slot />
          </div>

          <div class="flex gap-3 justify-end">
            <Button variant="ghost" @click="handleCancel">{{ cancelText }}</Button>
            <Button :variant="actionVariant" :loading="loading" @click="handleConfirm">
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";
import Button from "./Button.vue";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "Подтвердить",
  },
  cancelText: {
    type: String,
    default: "Отмена",
  },
  variant: {
    type: String,
    default: "warning",
    validator: (value) => ["warning", "danger", "info", "success"].includes(value),
  },
  loading: Boolean,
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const actionVariant = computed(() => ({ warning: "primary", danger: "danger", info: "primary", success: "success" })[props.variant] || "primary");

const iconName = computed(
  () => ({ warning: "TriangleAlert", danger: "Trash2", info: "Info", success: "CircleCheck" })[props.variant] || "HelpCircle",
);

const iconBgClass = computed(
  () =>
    ({
      warning: "bg-amber-500/10 text-amber-600",
      danger: "bg-red-500/10 text-red-600",
      info: "bg-blue-500/10 text-blue-600",
      success: "bg-emerald-500/10 text-emerald-600",
    })[props.variant],
);

const handleConfirm = () => emit("confirm");
const handleCancel = () => {
  emit("cancel");
  emit("update:modelValue", false);
};
</script>

<style>
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
