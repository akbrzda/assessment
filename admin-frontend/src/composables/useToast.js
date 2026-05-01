import { toast as sonnerToast } from "vue-sonner";

// Длительность авто-скрытия по типу (мс)
const DURATIONS = {
  success: 3000,
  info: 4000,
  warning: 6000,
  error: Infinity, // не закрывается автоматически
};

export function useToast() {
  /**
   * @param {string | { title: string, description?: string }} message
   * @param {'success' | 'error' | 'warning' | 'info'} type
   */
  const showToast = (message, type = "info") => {
    const duration = DURATIONS[type] ?? 4000;
    const opts = { duration };

    // Поддержка объекта { title, description }
    if (typeof message === "object" && message !== null) {
      const { title, description } = message;
      if (type === "success") sonnerToast.success(title, { description, ...opts });
      else if (type === "error") sonnerToast.error(title, { description, ...opts });
      else if (type === "warning") sonnerToast.warning(title, { description, ...opts });
      else sonnerToast.info(title, { description, ...opts });
    } else {
      if (type === "success") sonnerToast.success(message, opts);
      else if (type === "error") sonnerToast.error(message, opts);
      else if (type === "warning") sonnerToast.warning(message, opts);
      else sonnerToast.info(message, opts);
    }
  };

  const removeToast = (id) => {
    if (id) sonnerToast.dismiss(id);
  };

  return {
    toasts: { value: [] },
    showToast,
    removeToast,
  };
}
