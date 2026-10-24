import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import pinia from './store'

import '@/assets/styles/base.css'

const app = createApp(App)

app.use(pinia) // 状态管理要先挂载：网络层的拦截器里会取 store
app.use(router)

app.mount('#app')