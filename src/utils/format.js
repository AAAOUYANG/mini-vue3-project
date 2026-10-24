/**
 * 纯工具函数：不依赖 Vue、不依赖 store，任何层都可以直接用。
 * 约定：工具函数只做"输入 -> 输出"的转换，不发请求、不碰状态。
 */

/** 状态码 -> 文案：后端约定 1 启用、0 禁用 */
export function statusText(status) {
  if (Number(status) === 1) return '启用'
  if (Number(status) === 0) return '禁用'
  return '未知'
}

/** 计数字段兜底：后端 `default-property-inclusion: non_null` 会省略 null 字段 */
export function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

/**
 * 查询条件瘦身：把 '' / null / undefined 的键去掉再发给后端。
 * 后端 QueryVO 是无注解的 GET 参数绑定，传空串会走 like '%%'，语义上和"不筛选"不同，所以这里要清掉。
 */
export function compactQuery(query = {}) {
  return Object.entries(query).reduce((result, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) result[key] = value
    return result
  }, {})
}

/** 毫秒耗时 -> 易读文案 */
export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '-'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/** 表单 -> 提交体：去掉首尾空格，并且丢掉空值（后端 updateById 会忽略 null 字段） */
export function compactPayload(payload = {}) {
  return Object.entries(payload).reduce((result, [key, value]) => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed !== '') result[key] = trimmed
      return result
    }
    if (value !== null && value !== undefined) result[key] = value
    return result
  }, {})
}