<script setup>
import BaseButton from '@/components/BaseButton.vue'

/** 404 页面：路由表里的通配路由指向它 */
</script>

<template>
  <div class="not-found">
    <h1 class="not-found__code">404</h1>
    <p class="not-found__text">页面不存在，检查一下地址吧。</p>
    <RouterLink to="/home"><BaseButton type="primary">返回首页</BaseButton></RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.not-found__code {
  font-size: 64px;
  color: var(--color-text-muted);
}

.not-found__text {
  color: var(--color-text-secondary);
}
</style>