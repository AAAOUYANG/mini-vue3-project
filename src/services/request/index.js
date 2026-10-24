import axios from 'axios'

import useMainStore from '@/store/modules/main'
import { resolveErrorMessage } from '@/utils/error'
import { BASE_URL, SUCCESS_CODE, TIME_OUT } from './config'

/**
 * 网络请求类：只负责"发请求 + 拆统一响应体 + 归一化错误"。
 *
 * 分三层职责，互不越界：
 *  1. 拦截器：维护全局 loading（mainStore），把 axios 错误转成可读文案；
 *  2. request()：拆 ApiResponse，code !== 0 视为业务失败，成功时把 data 交给调用方；
 *  3. get/post/put/delete：语法糖，统一走 request()，保证四种方法的返回值形态一致。
 *
 * 注意（踩坑点）：store 只能在"函数调用时"取，不能写在模块顶层。
 * 模块顶层 `const mainStore = useMainStore()` 会因为 pinia 还没被 app.use() 而报
 * "getActivePinia() was called but there was no active Pinia"。
 */
class HyRequest {
  constructor({ baseURL = BASE_URL, timeout = TIME_OUT } = {}) {
    this.instance = axios.create({ baseURL, timeout })

    // 请求拦截：打开全局 loading
    this.instance.interceptors.request.use(
      (config) => {
        useMainStore().startLoading()
        return config
      },
      (error) => {
        useMainStore().finishLoading()
        return Promise.reject(error)
      }
    )

    // 响应拦截：关闭全局 loading，并校验统一响应体格式
    this.instance.interceptors.response.use(
      (response) => {
        useMainStore().finishLoading()
        const body = response.data
        if (!body || typeof body !== 'object' || !('code' in body)) {
          return Promise.reject(new Error(`响应格式不符合 ApiResponse 约定：${response.config.url}`))
        }
        return body
      },
      (error) => {
        useMainStore().finishLoading()
        return Promise.reject(new Error(resolveErrorMessage(error)))
      }
    )
  }

  /** 拆包：把 ApiResponse<T> 拆成 T；code !== 0 时 reject 出后端给的 message */
  request(config = {}) {
    return new Promise((resolve, reject) => {
      this.instance
        .request(config)
        .then((body) => {
          if (body.code !== SUCCESS_CODE) {
            reject(new Error(body.message || `请求失败（code=${body.code}）`))
            return
          }
          resolve(body.data)
        })
        .catch(reject)
    })
  }

  get(config) {
    return this.request({ ...config, method: 'get' })
  }

  post(config) {
    return this.request({ ...config, method: 'post' })
  }

  put(config) {
    return this.request({ ...config, method: 'put' })
  }

  delete(config) {
    return this.request({ ...config, method: 'delete' })
  }
}

/** 全局唯一实例：业务模块直接 import 这个对象即可 */
const hyRequest = new HyRequest()

export { HyRequest }
export default hyRequest