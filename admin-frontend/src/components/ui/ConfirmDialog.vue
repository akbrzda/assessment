<template>
  <Teleport to="body">
    <Transition name="confirm-modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 flex items-center justify-center p-5 backdrop-blur-[2px]"
        :style="{ zIndex: 'var(--z-modal)', background: 'hsl(215 28% 8% / 0.65)' }"
        role="alertdialog"
        :aria-modal="true"
        :aria-labelledby="'confirm-title-' + uid"
        :aria-describedby="'confirm-desc-' + uid"
        @click="handleCancel"
        @keydown.esc="handleCancel"
      >
        <div
          class="bg-background rounded-[var(--radius-lg)] max-w-[420px] w-full border border-border/80 overflow-hidden"
          :style="{ boxShadow: 'var(--shadow-modal)' }"
          @click.stop
        >
          <!-- Шапка с иконкой -->
          <div class="px-6 pt-6 pb-4">
            <div class="flex items-start gap-4 mb-4">
              <div
                :class="cn('flex items-center justify-center w-12 h-12 rounded-xl shrink-0', iconBgClass)"
                :style="variant === 'danger' ? { animation: 'confirm-danger-pulse 2s ease-in-out infinite' } : {}"
              >
                <Icon :name="iconName" :size="24" :stroke-width="2.25" aria-hidden="true" />
              </div>
              <div class="flex-1 min-w-0 pt-1">
                <h2 :id="'confirm-title-' + uid" :class="cn('text-lg font-semibold m-0 mb-1', titleColorClass)">{{ title }}</h2>
                <p :id="'confirm-desc-' + uid" class="text-sm text-muted-foreground m-0 leading-relaxed">{{ message }}</p>
              </div>
            </div>

            <!-- Слот для дополнительного контента -->
            <slot />

            <!-- Блок последствий (для danger-варианта) -->
            <div
              v-if="consequences && consequences.length"
              class="mt-3 rounded-[var(--radius-sm)] border px-4 py-3"
              :style="{ background: 'hsl(var(--color-warning-subtle))', borderColor: 'hsl(var(--color-warning-border) / 0.4)' }"
            >
              <div class="flex items-center gap-2 mb-2">
                <Icon name="TriangleAlert" :size="14" class="text-accent-orange shrink-0" />
                <span class="text-xs font-semibold text-accent-orange">Будет удалено без возможности восстановления:</span>
              </div>
              <ul class="m-0 pl-4 space-y-1">
                <li v-for="item in consequences" :key="item" class="text-xs text-foreground/80">{{ item }}</li>
              </ul>
            </div>

            <!-- Текстовое подтверждение для необратимых операций -->
            <div v-if="confirmWord" class="mt-3">
              <label class="block text-xs font-medium text-muted-foreground mb-1.5">
                Введите <span class="font-semibold text-foreground">{{ confirmWord }}</span>, чтобы подтвердить:
              </label>
              <input
                v-model="confirmInput"
                type="text"
                :placeholder="confirmWord"
                class="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] border bg-background text-foreground placeholder-muted-foreground/60 focus:outline-none focus-visible:shadow-[var(--focus-ring)] transition-shadow"
                :style="{ borderColor: confirmInput === confirmWord ? 'hsl(var(--color-success-border))' : 'hsl(var(--border))' }"
                @keydown.enter="handleConfirm"
              />
            </div>
          </div>

          <!-- Разделитель -->
          <div class="border-t border-border/60" />

          <!-- Кнопки -->
          <div class="px-6 py-4 bg-muted/30 flex gap-3 justify-end">
            <Button variant="ghost" @click="handleCancel">{{ cancelText }}</Button>
            <Button
              :variant="actionVariant"
              :loading="loading"
              :disabled="confirmWord ? confirmInput !== confirmWord : false"
              @click="handleConfirm"
            >
              <Icon v-if="variant === 'danger'" name="Trash2" :size="15" />
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref } from "vue";
import { cn } from "@/lib/utils";
import Button from "./Button.vue";
import Icon from "./Icon.vue";

let uidCounter = 0;
const uid = ++uidCounter;

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
  // Список последствий: ['128 студентов потеряют доступ', 'Все оценки будут удалены']
  consequences: {
    type: Array,
    default: () => [],
  },
  // Слово, которое нужно ввести для подтверждения (для критичных операций)
  confirmWord: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const confirmInput = ref("");

const actionVariant = computed(() => ({ warning: "primary", danger: "danger", info: "primary", success: "success" })[props.variant] || "primary");

const iconName = computed(
  () => ({ warning: "TriangleAlert", danger: "Trash2", info: "Info", success: "CircleCheck" })[props.variant] || "HelpCircle",
);

const iconBgClass = computed(
  () =>
    ({
      warning: "bg-accent-orange-soft text-accent-orange",
      danger: "bg-destructive/12 text-destructive",
      info: "bg-accent-blue-soft text-accent-blue",
      success: "bg-accent-green-soft text-accent-green",
    })[props.variant],
);

const titleColorClass = computed(
  () =>
    ({
      warning: "text-foreground",
      danger: "text-destructive",
      info: "text-foreground",
      success: "text-foreground",
    })[props.variant],
);

const handleConfirm = () => {
  if (props.confirmWord && confirmInput.value !== props.confirmWord) return;
  emit("confirm");
};

const handleCancel = () => {
  confirmInput.value = "";
  emit("cancel");
  emit("update:modelValue", false);
};
</script>

<style scoped>
.confirm-modal-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out-expo);
}
.confirm-modal-leave-active {
  transition: opacity var(--duration-fast) ease-in;
}
.confirm-modal-enter-from,
.confirm-modal-leave-to {
  opacity: 0;
}
.confirm-modal-enter-active > div,
.confirm-modal-leave-active > div {
  transition: transform var(--duration-normal) var(--ease-spring), opacity var(--duration-normal) var(--ease-out-expo);
}
.confirm-modal-enter-from > div {
  transform: scale(0.94) translateY(12px);
  opacity: 0;
}
.confirm-modal-leave-to > div {
  transform: scale(0.97) translateY(4px);
  opacity: 0;
}
</style>
