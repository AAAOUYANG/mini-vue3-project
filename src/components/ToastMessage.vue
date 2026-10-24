<script setup>
import { storeToRefs } from 'pinia'

import useMainStore from '@/store/modules/main'

/** 全局轻提示：挂在布局里一次，任何地方 showToast 都会渲染到这里 */
const mainStore = useMainStore()
const { toast } = storeToRefs(mainStore)
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="toast" :key="toast.id" class="toast" :class="`toast--${toast.type}`" role="status">
        {{ toast.text }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 2000;
  max-width: 70vw;
  padding: var(--space-2) var(--space-4);
  font-size: 13px;
  color: #fff;
  background: #374151;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
  transform: translateX(-50%);
}

.toast--success {
  background: var(--color-success);
}

.toast--error {
  background: var(--color-danger);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>