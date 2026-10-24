/**
 * 网络请求配置：BASE_URL / TIME_OUT 集中在这里，其他层不出现魔法字符串。
 * 值来自 .env.[mode]，见 .env.development / .env.production。
 */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const TIME_OUT = Number(import.meta.env.VITE_API_TIME_OUT) || 10000

/** 后端 ApiResponse 里代表成功的 code（见 common/ApiResponse.java: SUCCESS_CODE = 0） */
export const SUCCESS_CODE = 0