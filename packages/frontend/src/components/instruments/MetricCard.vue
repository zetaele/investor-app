<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  valueClass?: string;
  tooltip?: string;
}>();
</script>

<template>
  <div class="metric-card card" :title="tooltip">
    <p class="metric-label">
      {{ label }}
      <span v-if="tooltip" class="tooltip-icon">?</span>
    </p>
    <p class="metric-value font-mono num-reveal" :class="valueClass">
      {{ value }}
    </p>
  </div>
</template>

<style scoped>
.metric-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: default;
}

.metric-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  font-size: 0.6rem;
  color: var(--color-text-dim);
  cursor: help;
  font-style: normal;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}
</style>
