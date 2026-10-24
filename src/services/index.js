/**
 * 网络请求分拣站：把 services/modules 下的模块统一导出。
 * 好处是 store 里只写一行 `import { getUserPage } from '@/services'`，
 * 以后新增模块（比如 role、dept）只在这里加一行 re-export。
 */
export * from './modules/user'
export { default as hyRequest } from './request'