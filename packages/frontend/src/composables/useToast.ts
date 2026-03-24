import { reactive } from "vue";

export type ToastType = "error" | "warning" | "info" | "success";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

// Module-level reactive state — shared across all useToast() calls
const toasts = reactive<Toast[]>([]);
let nextId = 0;

const DURATION: Record<ToastType, number> = {
  error: 6000,
  warning: 5000,
  info: 4000,
  success: 3000,
};

export function useToast() {
  function addToast(type: ToastType, message: string, duration?: number): void {
    const id = nextId++;
    toasts.push({ id, type, message });
    setTimeout(() => removeToast(id), duration ?? DURATION[type]);
  }

  function removeToast(id: number): void {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }

  return { toasts, addToast, removeToast };
}
