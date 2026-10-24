<script setup>
import { computed } from 'vue'

/**
 * 通用按钮：统一 type / loading / disabled 三件事，业务组件只用它，不直接写 <button class="...">。
 */
const props = defineProps({
  /** primary | default | danger | text */
  type: { type: String, default: 'default' },
  size: { type: String, default: 'medium' }, // medium | small
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const classes = computed(() => [
  'base-button',
  `base-button--${props.type}`,
  `base-button--${props.size}`,
  { 'base-button--block': props.block }
])

const isDisabled = computed(() => props.disabled || props.loading)

function handleClick(event) {
  if (isDisabled.value) return
  emit('click', event)
}
</script>

<template>
  <button :class="classes" :disabled="isDisabled" type="button" @click="handleClick">
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 var(--space-4);
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.base-button--small {
  height: 28px;
  padding: 0 var(--space-3);
  font-size: 13px;
}

.base-button--block {
  width: 100%;
}

.base-button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.base-button--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.base-button--primary:hover:not(:disabled) {
  color: #fff;
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.base-button--danger {
  color: var(--color-danger);
  background: #fff;
  border-color: #fca5a5;
}

.base-button--danger:hover:not(:disabled) {
  color: #fff;
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.base-button--text {
  padding: 0 var(--space-1);
  color: var(--color-primary);
  background: transparent;
  border-color: transparent;
}

.base-button--text:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.base-button__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: base-button-spin 0.6s linear infinite;
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>