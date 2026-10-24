import { defineStore } from 'pinia'

import {
  createUser as createUserApi,
  getUserDetail,
  getUserPage,
  removeUser as removeUserApi,
  updateUser as updateUserApi
} from '@/services'
import { compactPayload, compactQuery, toNumber } from '@/utils/format'
import useMainStore from './main'

/** 每页条数可选项 */
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const createEmptyQuery = () => ({ username: '', nickname: '', status: '' })

/**
 * 用户模块状态：列表数据 + 查询条件 + 增删改查动作。
 *
 * 约定（对齐文章的分层思想）：
 *  - 组件里不直接发请求，网络请求只在 actions 里发生；
 *  - actions 调 services/modules 里的函数，请求参数在这里组装；
 *  - 成功提示由 store 统一弹（它知道这次是"新增"还是"删除"），失败则抛给页面决定怎么展示。
 */
const useUserStore = defineStore('user', {
  state: () => ({
    /** 当前页数据 */
    list: [],
    /** 总条数 */
    total: 0,
    /** 当前页码，从 1 开始 */
    pageNum: 1,
    /** 每页条数 */
    pageSize: 10,
    /** 查询条件（SearchBar 双向绑定的对象） */
    query: createEmptyQuery(),
    /** 分页方式：page 翻页 / append 追加（滚动到底部加载更多） */
    mode: 'page',
    /** 列表加载中 */
    listLoading: false,
    /** 表单提交中 */
    submitting: false
  }),

  getters: {
    /** 总页数（本地算一份，供"是否还有下一页"判断用） */
    pages: (state) => (state.pageSize > 0 ? Math.ceil(state.total / state.pageSize) : 0),

    /** 追加模式下是否还有更多数据可加载 */
    hasMore: (state) => state.mode === 'append' && state.list.length < state.total,

    isAppendMode: (state) => state.mode === 'append',

    /** 组装给后端的查询参数：丢掉空值，status 转成数字 */
    queryParams: (state) =>
      compactQuery({
        username: state.query.username,
        nickname: state.query.nickname,
        status: state.query.status === '' || state.query.status === null ? '' : Number(state.query.status)
      })
  },

  actions: {
    /** 拉取当前页：列表渲染的唯一数据来源 */
    async fetchUserPage() {
      this.listLoading = true
      try {
        const page = await getUserPage({
          pageNum: this.pageNum,
          pageSize: this.pageSize,
          ...this.queryParams
        })
        this.list = page?.records ?? []
        this.total = toNumber(page?.total)
        this.pageNum = toNumber(page?.pageNum, this.pageNum)
        this.pageSize = toNumber(page?.pageSize, this.pageSize)
      } finally {
        this.listLoading = false
      }
    },

    /** 条件查询：条件变化后要回到第 1 页 */
    search() {
      this.pageNum = 1
      return this.fetchUserPage()
    },

    /** 切换分页方式：page 翻页 / append 滚动加载更多；切换后回到第一页重新取数 */
    setMode(mode) {
      if (this.mode === mode) return Promise.resolve()
      this.mode = mode
      this.pageNum = 1
      return this.fetchUserPage()
    },

    /**
     * 追加下一页（文章里"下拉加载更多"的做法）：
     * 用 push(...records) 而不是 this.list = records，否则会把已加载的数据覆盖掉；
     * 用展开运算符把数组拆成单个元素再 push，否则 list 会变成二维数组。
     */
    async loadMore() {
      if (!this.hasMore || this.listLoading) return

      this.listLoading = true
      try {
        const page = await getUserPage({
          pageNum: this.pageNum + 1,
          pageSize: this.pageSize,
          ...this.queryParams
        })
        this.list.push(...(page?.records ?? []))
        this.total = toNumber(page?.total, this.total)
        this.pageNum = toNumber(page?.pageNum, this.pageNum + 1)
        this.pageSize = toNumber(page?.pageSize, this.pageSize)
      } finally {
        this.listLoading = false
      }
    },

    /** 重置条件并重新查询 */
    resetQuery() {
      this.query = createEmptyQuery()
      this.pageNum = 1
      return this.fetchUserPage()
    },

    changePage(pageNum) {
      this.pageNum = pageNum
      return this.fetchUserPage()
    },

    changePageSize(pageSize) {
      this.pageSize = pageSize
      this.pageNum = 1
      return this.fetchUserPage()
    },

    /** 详情：编辑弹窗打开时取一次最新数据（后端查不到时 data 被省略，这里是 undefined） */
    fetchUserDetail(id) {
      return getUserDetail(id)
    },

    /** 新增：密码必填 */
    async createUser(form) {
      this.submitting = true
      try {
        const created = await createUserApi(compactPayload(form))
        useMainStore().showToast('新增成功', 'success')
        await this.fetchUserPage()
        return created
      } finally {
        this.submitting = false
      }
    },

    /** 修改：密码留空则不提交该字段（后端 updateById 忽略 null，不会把密码清空） */
    async updateUser(id, form) {
      this.submitting = true
      try {
        const updated = await updateUserApi(id, compactPayload(form))
        useMainStore().showToast('修改成功', 'success')
        await this.fetchUserPage()
        return updated
      } finally {
        this.submitting = false
      }
    },

    /** 删除：后端是软删除 */
    async deleteUser(id) {
      this.submitting = true
      try {
        const success = await removeUserApi(id)
        useMainStore().showToast(success ? '删除成功' : '该用户已删除', success ? 'success' : 'info')
        // 删掉当前页最后一条时往前翻一页，避免停在空页上
        if (success && this.list.length === 1 && this.pageNum > 1) this.pageNum -= 1
        await this.fetchUserPage()
        return success
      } finally {
        this.submitting = false
      }
    }
  }
})

export default useUserStore