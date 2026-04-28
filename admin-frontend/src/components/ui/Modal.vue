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
      <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click="handleOverlayClick">
        <div
          :class="cn('bg-background rounded-xl shadow-modal max-h-[90vh] overflow-y-auto w-full animate-in fade-in-0 zoom-in-95', sizeClass)"
          @click.stop
        >
          <div v-if="title || closable" class="flex items-center justify-between px-6 py-4 border-b border-border bg-muted">
            <h2 v-if="title" class="text-xl font-semibold text-foreground m-0">{{ title }}</h2>
            <button
              v-if="closable"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-nav-hover hover:text-foreground transition-colors duration-200 border-none bg-transparent cursor-pointer text-lg"
              @click="close"
            >
              ✕
            </button>
          </div>
          <div class="p-6">
            <slot />
          </div>
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-border bg-muted">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

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
  if (props.closeOnOverlay) {
    close();
  }
};
</script>
