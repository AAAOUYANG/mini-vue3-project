<script setup>
import { watch } from 'vue'

import BaseButton from './BaseButton.vue'

/**
 * 通用弹窗：受控组件，用 v-model 控制显隐。
 *
 *   <BaseDialog v-model="visible" title="新增用户" :confirm-loading="submitting" @confirm="submit">
 *     <UserForm ... />
 *   </BaseDialog>
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: 480 },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  confirmLoading: { type: Boolean, default: false },
  /** 是否显示底部按钮区 */
  showFooter: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'closed'])

function close() {
  if (props.confirmLoading) return
  emit('update:modelValue', false)
  emit('cancel')
}

function handleConfirm() {
  emit('confirm')
}

// 弹窗打开时锁住 body 滚动，关闭时恢复
watch(
  () => props.modelValue,
  (visible) => {
    document.body.style.overflow = visible ? 'hidden' : ''
    if (!visible) emit('closed')
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="dialog">
        <div class="dialog__mask" @click.self="close" />
        <div class="dialog__panel" :style="{ width: typeof width === 'number' ? `${width}px` : width }">
          <header class="dialog__header">
            <h3 class="dialog__title">{{ title }}</h3>
            <button class="dialog__close" type="button" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="dialog__body">
            <slot />
          </div>

          <footer v-if="showFooter" class="dialog__footer">
            <slot name="footer">
              <BaseButton :disabled="confirmLoading" @click="close">{{ cancelText }}</BaseButton>
              <BaseButton type="primary" :loading="confirmLoading" @click="handleConfirm">
                {{ confirmText }}
              </BaseButton>
            </slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog__mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.dialog__panel {
  position: relative;
  max-width: calc(100vw - 32px);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
}

.dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.dialog__title {
  font-size: 16px;
  font-weight: 600;
}

.dialog__close {
  font-size: 20px;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
}

.dialog__close:hover {
  color: var(--color-text);
}

.dialog__body {
  padding: var(--space-5);
}

.dialog__footer {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>