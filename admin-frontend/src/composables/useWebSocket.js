import { ref, onMounted, onUnmounted } from "vue";
import websocketService from "@/services/websocket";

export function useWebSocket() {
  const isConnected = ref(false);
  const connectionStatus = ref(null);

  const updateStatus = () => {
    const status = websocketService.getConnectionStatus();
    isConnected.value = status.connected;
    connectionStatus.value = status;
  };

  let unsubscribeStatus = null;

  onMounted(() => {
    updateStatus();

    // Подписываемся на изменения статуса
    unsubscribeStatus = websocketService.on("status:changed", (data) => {
      isConnected.value = data.connected;
      updateStatus();
    });
  });

  onUnmounted(() => {
    if (unsubscribeStatus) {
      unsubscribeStatus();
    }
  });

  return {
    isConnected,
    connectionStatus,
    on: (event, handler) => websocketService.on(event, handler),
    off: (event, handler) => websocketService.off(event, handler),
    send: (event, data) => websocketService.send(event, data),
  };
}
