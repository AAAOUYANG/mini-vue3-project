<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import useMainStore from '@/store/modules/main'

/**
 * 应用布局：顶部导航 + 内容区，作为所有页面的父路由组件。
 * 导航项直接从路由表的 meta.nav 里生成，加页面时只改 router/index.js 一处。
 */
const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()

const navItems = computed(() =>
  router
    .getRoutes()
    .filter((item) => item.meta?.nav)
    .map((item) => ({ path: item.path, title: item.meta.title }))
)

/**
 * 页脚显示的部署信息，刻意**不写死端口**：
 *  - 容器化部署：nginx 回的 X-Backend-Origin / X-Frontend-Env 就是当前真实的链路，直接显示；
 *  - 本机 npm run dev：没有这两个头，只说明走开发代理，具体目标见 vite.config.js 的 BACKEND_ORIGIN。
 */
const deployText = computed(() => {
  if (!mainStore.backendOrigin) {
    return '后端：mini-spring-cloud-project（网关，本机开发经 Vite 代理 /api 转发）'
  }
  const env = mainStore.frontendEnv ? ` · 环境 ${mainStore.frontendEnv}` : ''
  return `后端：mini-spring-cloud-project（网关）· 反代目标 ${mainStore.backendOrigin}（来自 Nacos）${env}`
})
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__brand">
        mini-vue3-project
        <span class="layout__brand-tag">vue3 + vite + pinia + axios</span>
      </div>

      <nav class="layout__nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          class="layout__nav-item"
          :class="{ 'layout__nav-item--active': route.path === item.path }"
          :to="item.path"
        >
          {{ item.title }}
        </RouterLink>
      </nav>
    </header>

    <main class="layout__main">
      <RouterView />
    </main>

    <footer class="layout__footer">
      {{ deployText }}
    </footer>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  gap: var(--space-6);
  align-items: center;
  height: var(--header-height);
  padding: 0 var(--space-6);
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}

.layout__brand {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  font-size: 16px;
  font-weight: 600;
}

.layout__brand-tag {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.layout__nav {
  display: flex;
  gap: var(--space-2);
}

.layout__nav-item {
  padding: var(--space-1) var(--space-3);
  font-size: 14px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.layout__nav-item:hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.layout__nav-item--active {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.layout__main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  padding: var(--space-5) var(--space-6);
  margin: 0 auto;
}

.layout__footer {
  padding: var(--space-4) var(--space-6);
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
  border-top: 1px solid var(--color-border);
}
</style>