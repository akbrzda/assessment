import { ref, watch } from "vue";

export function useSkeletonGate(sourceRef, options = {}) {
  const minDuration = Number(options.minDuration ?? 320);
  const delay = Number(options.delay ?? 80);

  const visible = ref(Boolean(sourceRef.value));
  let delayTimer = null;
  let hideTimer = null;
  let shownAt = visible.value ? Date.now() : 0;

  const clearTimers = () => {
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  watch(
    sourceRef,
    (value) => {
      clearTimers();

      if (value) {
        delayTimer = setTimeout(() => {
          visible.value = true;
          shownAt = Date.now();
        }, delay);
        return;
      }

      if (!visible.value) {
        return;
      }

      const elapsed = Date.now() - shownAt;
      const remaining = Math.max(0, minDuration - elapsed);
      hideTimer = setTimeout(() => {
        visible.value = false;
      }, remaining);
    },
    { immediate: true },
  );

  return { skeletonVisible: visible };
}
