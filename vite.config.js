import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端 mini-spring-boot-project 默认跑在 http://localhost:8080，且没有配置 CORS，
// 所以开发期统一走 Vite 代理：浏览器请求 /api/user/page -> 代理到 http://localhost:8080/user/page。
// 这样前端代码里只出现 /api 前缀，不用关心跨域，也不用改后端。
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:8080'

/**
 * 开发服务器（dev）和预览服务器（preview）都要打到后端，但 Vite 的 preview **不继承** server.proxy，
 * 只配 server.proxy 的话 `npm run preview` 页面能开、`/api` 请求却会 404（preview 自己把 /api 当静态路径）。
 * 所以这里抽一份出来，两边都挂上。
 */
const apiProxy = {
  '/api': {
    target: BACKEND_ORIGIN,
    changeOrigin: true,
    // 去掉 /api 前缀：/api/user/page -> /user/page
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}

/**
 * 端口刻意避开了 Vite 默认的 5173/5174：本机 517x 这段被别的工具（会返回 404 的 Vite 实例）占着，
 * 直接用默认端口会出现"打开 5173 是 404、其实服务在别的端口"这种误导。
 * 需要改端口时用环境变量覆盖：DEV_PORT=5300 PREVIEW_PORT=5301 npm run dev
 */
const DEV_PORT = Number(process.env.DEV_PORT) || 5300
const PREVIEW_PORT = Number(process.env.PREVIEW_PORT) || 5301

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: DEV_PORT,
    open: false,
    proxy: apiProxy
  },
  preview: {
    port: PREVIEW_PORT,
    open: false,
    proxy: apiProxy
  }
})