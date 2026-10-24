<script setup>
import { storeToRefs } from 'pinia'

import useMainStore from '@/store/modules/main'

/**
 * 全局请求进度条：数据来源是 store 里的 pendingCount（由 axios 拦截器维护），
 * 所以组件里不需要任何"请求前后手动开关"的代码。
 */
const mainStore = useMainStore()
const { isLoading } = storeToRefs(mainStore)
</script>

<template>
  <Transition name="loading-fade">
    <div v-if="isLoading" class="loading-bar" role="progressbar" aria-label="加载中">
      <div class="loading-bar__inner" />
    </div>
  </Transition>
</template>

<style scoped>
.loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 3000;
  width: 100%;
  height: 2px;
  overflow: hidden;
  background: var(--color-primary-soft);
}

.loading-bar__inner {
  width: 40%;
  height: 100%;
  background: var(--color-primary);
  animation: loading-bar-move 1s ease-in-out infinite;
}

@keyframes loading-bar-move {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(250%);
  }
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>