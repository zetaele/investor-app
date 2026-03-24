<script setup lang="ts">
defineProps<{
  message: string;
  /** If provided, shows a retry button that calls this function when clicked. */
  onRetry?: (() => void) | undefined;
}>();
</script>

<template>
  <div class="error-banner" role="alert">
    <div class="error-body">
      <span class="error-icon" aria-hidden="true">⚠</span>
      <div class="error-content">
        <p class="error-label font-mono">Error</p>
        <p class="error-message">{{ message }}</p>
      </div>
    </div>
    <button v-if="onRetry !== undefined" class="retry-btn" @click="onRetry()">Reintentar</button>
  </div>
</template>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 0.625rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  flex-wrap: wrap;
}

.error-body {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.error-icon {
  font-size: 1rem;
  color: #f87171;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.error-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #f87171;
  margin: 0;
}

.error-message {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.retry-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.375rem 0.875rem;
  border-radius: 0.4rem;
  transition: all var(--transition-base);
  white-space: nowrap;
  flex-shrink: 0;
}
.retry-btn:hover {
  background: rgba(239, 68, 68, 0.12);
}
</style>
