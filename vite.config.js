import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端是 mini-spring-cloud-project：**网关 mini-gateway 是唯一入口**，本机跑在 http://localhost:9000，
// 前端只发相对路径 /api/**，跨域由 Vite 代理解决（后端没配 CORS）。
// 网关对外路由本身就是 /api/user/**，去前缀由网关自己的 StripPrefix 做，所以默认**保留** /api 前缀。
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:9000'

/**
 * 是否给 /api 去掉前缀。默认 **true（保留）**，与网关路由对齐：
 * 代理层删掉 /api 会变成 /user/page 打到网关，网关没有这条路由 → 直接 404。
 *
 * 只有"绕过网关直连某个后端服务"时才需要删（那些服务的路由是 /user/**）：
 *   BACKEND_ORIGIN=http://127.0.0.1:18081 BACKEND_KEEP_API_PREFIX=false npm run dev
 */
const KEEP_API_PREFIX = process.env.BACKEND_KEEP_API_PREFIX !== 'false'

/**
 * 开发服务器（dev）和预览服务器（preview）都要打到后端，但 Vite 的 preview **不继承** server.proxy，
 * 只配 server.proxy 的话 `npm run preview` 页面能开、`/api` 请求却会 404（preview 自己把 /api 当静态路径）。
 * 所以这里抽一份出来，两边都挂上。
 */
const apiProxy = {
  '/api': {
    target: BACKEND_ORIGIN,
    changeOrigin: true,
    // 默认保留 /api（与网关路由一致）；BACKEND_KEEP_API_PREFIX=false 时删掉，用于直连后端服务
    ...(KEEP_API_PREFIX ? {} : { rewrite: (path) => path.replace(/^\/api/, '') })
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