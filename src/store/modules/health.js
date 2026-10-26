import { defineStore } from 'pinia'

import { getUserPage } from '@/services'
import { BASE_URL } from '@/services/request/config'
import { formatDuration, toNumber } from '@/utils/format'

/**
 * 后端连通性自检：首页用它判断 mini-spring-cloud-project（网关）是否已经启动、接口前缀是否配通。
 * 同样是"组件不发请求"：首页只读状态、只调 action。
 *
 * 探测方式选 /user/page?pageNum=1&pageSize=1：它是纯读接口，代价最小，
 * 又能同时验证「路由可达 + 统一响应体 + 分页结构」三件事。（浏览器实际发的是 /api/user/page…，前缀由环境决定）
 */
const useHealthStore = defineStore('health', {
  state: () => ({
    /** idle | checking | ok | fail */
    status: 'idle',
    /** 失败原因 */
    message: '',
    /** 后端返回的用户总数 */
    total: 0,
    /** 本次探测耗时（毫秒） */
    duration: 0,
    /** 最近一次探测时间 */
    checkedAt: ''
  }),

  getters: {
    isChecking: (state) => state.status === 'checking',
    isOk: (state) => state.status === 'ok',
    durationText: (state) => (state.status === 'idle' ? '-' : formatDuration(state.duration)),
    /** 当前请求前缀，方便排查代理配置 */
    apiBaseUrl: () => BASE_URL
  },

  actions: {
    async check() {
      this.status = 'checking'
      this.message = ''

      const start = performance.now()
      try {
        const page = await getUserPage({ pageNum: 1, pageSize: 1 })
        this.total = toNumber(page?.total)
        this.status = 'ok'
      } catch (error) {
        this.total = 0
        this.status = 'fail'
        this.message = error.message
      } finally {
        this.duration = performance.now() - start
        this.checkedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      }
    }
  }
})

export default useHealthStore