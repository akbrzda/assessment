<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isVisible"
        class="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-[2px]"
        :style="{ zIndex: 'var(--z-modal)', background: 'hsl(215 28% 8% / 0.6)' }"
        role="dialog"
        :aria-modal="true"
        :aria-label="title"
        @click="handleOverlayClick"
        @keydown.esc="handleEsc"
      >
        <div
          ref="modalContainer"
          tabindex="-1"
          :class="cn('bg-background rounded-[var(--radius-lg)] max-h-[90vh] overflow-y-auto w-full border border-border/80 flex flex-col', sizeClass)"
          :style="{ boxShadow: 'var(--shadow-modal)' }"
          @click.stop
        >
          <!-- Шапка -->
          <div v-if="title || closable" class="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/40 shrink-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <Icon v-if="icon" :name="icon" :size="18" class="text-primary shrink-0" />
              <h2 v-if="title" class="text-lg font-semibold text-foreground m-0 truncate">{{ title }}</h2>
            </div>
            <button
              v-if="closable"
              class="flex items-center justify-center w-8 h-8 rounded-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 border-none bg-transparent cursor-pointer shrink-0 ml-3 focus-visible:shadow-[var(--focus-ring)]"
              aria-label="Закрыть"
              @click="close"
            >
              <Icon name="X" :size="16" />
            </button>
          </div>

          <!-- Контент -->
          <div class="p-6 flex-1">
            <slot />
          </div>

          <!-- Футер -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-border/80 bg-muted/40 shrink-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined,
  },
  show: {
    type: Boolean,
    default: false,
  },
  title: String,
  icon: String,
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg", "xl"].includes(value),
  },
  closable: {
    type: Boolean,
    default: true,
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["close", "update:modelValue"]);
const modalContainer = ref(null);
const lastFocusedElement = ref(null);

const isVisible = computed(() => (props.modelValue !== undefined ? props.modelValue : props.show));

const sizeClass = computed(
  () =>
    ({
      sm: "max-w-[400px]",
      md: "max-w-[600px]",
      lg: "max-w-[800px]",
      xl: "max-w-[1000px]",
    })[props.size],
);

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) close();
};

const handleEsc = () => {
  if (props.closable) close();
};

const getFocusableElements = () => {
  if (!modalContainer.value) return [];
  return Array.from(
    modalContainer.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
};

const focusFirstElement = () => {
  const focusable = getFocusableElements();
  if (focusable.length > 0) {
    focusable[0].focus();
    return;
  }
  modalContainer.value?.focus();
};

const handleTabTrap = (event) => {
  if (!isVisible.value || event.key !== "Tab") return;
  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    event.preventDefault();
    modalContainer.value?.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

// Блокировка скролла body пока модал открыт
watch(isVisible, (val) => {
  document.body.style.overflow = val ? "hidden" : "";
  if (val) {
    lastFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    nextTick(() => {
      focusFirstElement();
      document.addEventListener("keydown", handleTabTrap);
    });
    return;
  }

  document.removeEventListener("keydown", handleTabTrap);
  if (lastFocusedElement.value && typeof lastFocusedElement.value.focus === "function") {
    lastFocusedElement.value.focus();
  }
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleTabTrap);
});
</script>

<style scoped>
.modal-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out-expo);
}
.modal-leave-active {
  transition: opacity var(--duration-fast) ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform var(--duration-normal) var(--ease-spring), opacity var(--duration-normal) var(--ease-out-expo);
}
.modal-enter-from > div {
  transform: scale(0.96) translateY(10px);
  opacity: 0;
}
.modal-leave-to > div {
  transform: scale(0.97) translateY(6px);
  opacity: 0;
}
</style>
