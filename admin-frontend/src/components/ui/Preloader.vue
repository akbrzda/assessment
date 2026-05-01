<template>
  <div class="flex flex-col items-center justify-center py-12 min-h-[200px] gap-4">
    <div class="h-10 w-10 animate-spin rounded-full border-[3px] border-border border-t-accent-blue" />
    <Transition name="preloader-text">
      <div v-if="stage > 0" class="flex flex-col items-center gap-2 text-center">
        <p class="text-sm font-medium text-muted-foreground">{{ stageText }}</p>
        <button
          v-if="stage >= 2 && onRetry"
          class="text-xs text-primary underline underline-offset-2 cursor-pointer bg-transparent border-none hover:text-primary/80 transition-colors"
          @click="onRetry"
        >
          Попробовать снова
        </button>
      </div>
      <p v-else class="text-sm font-medium text-muted-foreground">Загрузка...</p>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  // Колбэк для кнопки «Попробовать снова» (появляется на 3+ стадии)
  onRetry: {
    type: Function,
    default: null,
  },
});

const stage = ref(0);
let timers = [];

// Стадии деградации: 0 = "Загрузка...", 1 = 3с, 2 = 10с
const STAGES = [
  { delay: 3000, text: "Загружаем данные..." },
  { delay: 10000, text: "Это занимает дольше обычного..." },
  { delay: 30000, text: "Что-то пошло не так. Попробуйте обновить страницу." },
];

const stageText = ref("");

onMounted(() => {
  STAGES.forEach(({ delay, text }, i) => {
    const t = setTimeout(() => {
      stage.value = i + 1;
      stageText.value = text;
    }, delay);
    timers.push(t);
  });
});

onUnmounted(() => {
  timers.forEach(clearTimeout);
});
</script>

<style scoped>
.preloader-text-enter-active {
  transition:
    opacity var(--duration-normal) ease-out,
    transform var(--duration-normal) ease-out;
}
.preloader-text-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
</style>
