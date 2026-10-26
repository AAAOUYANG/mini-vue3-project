import { defineStore } from 'pinia'

// 定时器不放 state：它不是需要响应式的数据
let toastTimer = null

/**
 * 全局状态：请求 loading 计数 + 轻提示 + 部署信息。
 * network 层（services/request）在拦截器里调用 startLoading / finishLoading，
 * 页面里用 v-if="mainStore.isLoading" 显示进度条，两者通过 store 解耦。
 *
 * deploy 信息也由拦截器顺手采集：容器化部署时 nginx 会回 X-Backend-Origin / X-Frontend-Env
 * 两个响应头（值来自 Nacos），页脚用它显示"当前真正把 /api 转到了哪里、读的是哪个环境"。
 * 本机 npm run dev 没有这两个头，页脚就回落到开发代理的说明。
 */
const useMainStore = defineStore('main', {
  state: () => ({
    /** 进行中的请求数：>0 时 isLoading 为 true */
    pendingCount: 0,
    /** 当前提示：{ id, text, type } | null */
    toast: null,
    /** nginx 反代目标（来自 Nacos），空字符串表示当前不是容器化部署 */
    backendOrigin: '',
    /** 前端读的是哪个环境的配置（dev / prod），空字符串表示未知 */
    frontendEnv: ''
  }),

  getters: {
    isLoading: (state) => state.pendingCount > 0
  },

  actions: {
    startLoading() {
      this.pendingCount += 1
    },

    finishLoading() {
      // 用 max 兜底：拦截器里 request 失败 + response 失败理论上不会重复减，但防止出现负数导致进度条卡住
      this.pendingCount = Math.max(0, this.pendingCount - 1)
    },

    /** 采集部署信息；响应头里没有（本机开发）时保持原样，避免把已有值冲成空 */
    setDeployInfo({ backendOrigin, frontendEnv } = {}) {
      if (backendOrigin) this.backendOrigin = backendOrigin
      if (frontendEnv) this.frontendEnv = frontendEnv
    },

    /** type: info | success | error */
    showToast(text, type = 'info', duration = 2600) {
      if (!text) return
      this.toast = { id: Date.now(), text, type }
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        this.toast = null
        toastTimer = null
      }, duration)
    },

    hideToast() {
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = null
      this.toast = null
    }
  }
})

export default useMainStore