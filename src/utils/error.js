/**
 * 错误归一化：把 axios 的各种失败姿势统一成一句给用户看的中文文案。
 *
 * 后端 GlobalExceptionHandler 的失败响应体同样是 ApiResponse：{ code, message, data: null }，
 * code 等于 HTTP 状态码（400 / 500 ...），所以优先取响应体里的 message。
 */
export function resolveErrorMessage(error) {
  if (!error) return '未知错误'

  // 主动抛出的业务/格式错误（已经是可读文案）
  if (!error.isAxiosError) return error.message || '未知错误'

  // 请求已发出，但没等到响应：后端没启动、端口不对、被代理拦截
  if (error.code === 'ECONNABORTED') return `请求超时：${error.config?.url ?? ''}`
  if (error.code === 'ERR_NETWORK') {
    return '连不上后端服务，请确认 mini-spring-boot-project 已在 http://localhost:8080 启动'
  }

  const body = error.response?.data
  if (body && typeof body === 'object' && body.message) return body.message
  if (error.response?.status) return `请求失败（HTTP ${error.response.status}）`
  return error.message || '请求失败'
}