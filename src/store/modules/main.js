import { defineStore } from 'pinia'

// 定时器不放 state：它不是需要响应式的数据
let toastTimer = null

/**
 * 全局状态：请求 loading 计数 + 轻提示。
 * network 层（services/request）在拦截器里调用 startLoading / finishLoading，
 * 页面里用 v-if="mainStore.isLoading" 显示进度条，两者通过 store 解耦。
 */
const useMainStore = defineStore('main', {
  state: () => ({
    /** 进行中的请求数：>0 时 isLoading 为 true */
    pendingCount: 0,
    /** 当前提示：{ id, text, type } | null */
    toast: null
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