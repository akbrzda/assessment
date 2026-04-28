import { toast as sonnerToast } from "vue-sonner";

export function useToast() {
  const showToast = (message, type = "info") => {
    if (type === "success") sonnerToast.success(message);
    else if (type === "error") sonnerToast.error(message);
    else if (type === "warning") sonnerToast.warning(message);
    else sonnerToast.info(message);
  };

  const removeToast = () => {};

  return {
    toasts: { value: [] },
    showToast,
    removeToast,
  };
}
