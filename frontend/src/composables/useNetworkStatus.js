import { onBeforeUnmount, onMounted, ref } from "vue";

export function useNetworkStatus() {
  const isOffline = ref(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const isBannerDismissed = ref(false);

  const handleOnline = () => {
    isOffline.value = false;
    isBannerDismissed.value = false;
  };

  const handleOffline = () => {
    isOffline.value = true;
  };

  function dismissOfflineBanner() {
    isBannerDismissed.value = true;
  }

  onMounted(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  });

  return {
    isOffline,
    isBannerDismissed,
    dismissOfflineBanner,
  };
}
