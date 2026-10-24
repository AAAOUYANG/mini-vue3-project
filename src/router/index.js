import { createRouter, createWebHashHistory } from 'vue-router'

import AppLayout from '@/views/layout/AppLayout.vue'

/**
 * 路由表：布局用"父路由 + children"，页面组件一律懒加载（() => import(...)），
 * 这样打包后每个页面是独立 chunk，首屏只加载布局和首页。
 */
const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '', // 对应 /
        redirect: '/home'
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/Home.vue'),
        meta: { title: '首页', nav: true }
      },
      {
        path: 'user',
        name: 'UserList',
        component: () => import('@/views/user/UserList.vue'),
        meta: { title: '用户管理', nav: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  // Hash 模式：部署时不需要服务端配 history fallback
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · mini-vue3-project` : 'mini-vue3-project'
})

export default router