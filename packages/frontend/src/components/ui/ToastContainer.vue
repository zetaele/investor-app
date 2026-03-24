<script setup lang="ts">
import { useToast } from "@/composables/useToast";

const { toasts, removeToast } = useToast();

const ICONS: Record<string, string> = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
  success: "✓",
};
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="alert"
        >
          <span class="toast-icon" aria-hidden="true">{{ ICONS[toast.type] }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            class="toast-close"
            :aria-label="`Cerrar notificación`"
            @click="removeToast(toast.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: 0.625rem;
  max-width: 380px;
  font-size: 0.875rem;
  font-weight: 500;
  pointer-events: all;
  border: 1px solid transparent;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.toast--error {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.toast--warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.toast--info {
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.3);
  color: #93c5fd;
}

.toast--success {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.toast-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
  opacity: 0.9;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  all: unset;
  cursor: pointer;
  font-size: 0.7rem;
  opacity: 0.5;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  transition: opacity var(--transition-base);
  flex-shrink: 0;
}
.toast-close:hover {
  opacity: 1;
}

/* Transitions */
.toast-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(1rem) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(0.5rem) scale(0.95);
}
.toast-move {
  transition: transform 0.2s ease;
}
</style>
