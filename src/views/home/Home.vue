<script setup>
import { computed, onMounted } from 'vue'

import BaseButton from '@/components/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import useHealthStore from '@/store/modules/health'

/**
 * 首页：项目的"说明书 + 自检页"。
 * 组件本身不写请求逻辑，只调用 healthStore.check()，状态也从 store 读。
 */
const healthStore = useHealthStore()

const layers = [
  { dir: 'assets', desc: '全局样式与颜色变量（variables.css 里定义，组件里用 var() 取）' },
  { dir: 'components', desc: '跨页面复用组件：按钮 / 弹窗 / 表格 / 分页 / 状态标签 / 提示' },
  { dir: 'hooks', desc: '可复用逻辑：滚动监听、轻提示' },
  { dir: 'router', desc: '路由表：布局作父路由，页面组件懒加载' },
  { dir: 'services', desc: '网络请求：request 里是封装类与配置，modules 里是各模块接口' },
  { dir: 'store', desc: 'Pinia 状态：modules 里按页面/模块拆开，请求都发生在 actions 里' },
  { dir: 'utils', desc: '纯函数工具：格式化、校验、错误归一化、节流' },
  { dir: 'views', desc: '页面：主页面建目录，子页面/子组件放同目录的 components 下' }
]

const endpointColumns = [
  { key: 'method', title: '方法', width: 90 },
  { key: 'path', title: '路由', width: 150 },
  { key: 'params', title: '入参' },
  { key: 'result', title: '返回' }
]

const endpoints = [
  { method: 'GET', path: '/user/page', params: 'pageNum、pageSize + 查询条件', result: 'PageResult<UserDTO>' },
  { method: 'GET', path: '/user/list', params: '查询条件', result: 'List<UserDTO>' },
  { method: 'GET', path: '/user/{id}', params: '路径 id', result: 'UserDTO（无此 id 时 data 被省略）' },
  { method: 'POST', path: '/user/save', params: 'UserDTO（含 password）', result: 'UserDTO' },
  { method: 'PUT', path: '/user/{id}', params: '路径 id + 要改的字段', result: 'UserDTO' },
  { method: 'DELETE', path: '/user/{id}', params: '路径 id', result: 'Boolean（软删除，只置 deleted=1）' }
]

const healthText = computed(() => {
  if (healthStore.isChecking) return '检测中…'
  if (healthStore.isOk) return '后端已连通'
  if (healthStore.status === 'fail') return '后端未连通'
  return '尚未检测'
})

const healthClass = computed(() => {
  if (healthStore.isOk) return 'health--ok'
  if (healthStore.status === 'fail') return 'health--fail'
  return 'health--idle'
})

onMounted(() => {
  healthStore.check()
})
</script>

<template>
  <div class="home">
    <section class="card">
      <h2 class="card__title">层次分明的 Vue3 极简项目</h2>
      <p class="card__desc">
        技术栈 vue3 + vite + vue-router + pinia + axios，后端对接
        <strong>mini-spring-boot-project</strong>（Spring Boot 2.7 + MyBatis-Plus，端口 8080）。
        架构按"资源 / 复用组件 / 逻辑 / 请求 / 状态 / 路由 / 页面"分层，每层只做一件事：
        页面不直接发请求，请求走 store 的 actions，store 调 services 里的接口函数。
      </p>
      <div class="row row--wrap home__actions">
        <RouterLink to="/user"><BaseButton type="primary">进入用户管理</BaseButton></RouterLink>
        <BaseButton :loading="healthStore.isChecking" @click="healthStore.check()">重新检测后端</BaseButton>
      </div>
    </section>

    <section class="card">
      <h3 class="card__title">后端连通性自检</h3>
      <div class="health" :class="healthClass">
        <span class="health__dot" />
        <span class="health__text">{{ healthText }}</span>
        <span class="health__meta">请求前缀 {{ healthStore.apiBaseUrl }} · 耗时 {{ healthStore.durationText }}</span>
      </div>

      <p v-if="healthStore.isOk" class="card__desc health__detail">
        探测接口 <code>GET /user/page?pageNum=1&amp;pageSize=1</code> 正常，当前共有
        <strong>{{ healthStore.total }}</strong> 条用户数据（含已软删除数据之外的全部未删除记录）。
      </p>
      <p v-else-if="healthStore.status === 'fail'" class="card__desc health__detail health__detail--fail">
        {{ healthStore.message }}
        <br />
        请在 backend 目录执行 <code>./mvnw spring-boot:run</code> 启动 mini-spring-boot-project（需要本地 MySQL）。
      </p>
      <p v-if="healthStore.checkedAt" class="card__desc health__detail">
        最近检测时间：{{ healthStore.checkedAt }}
      </p>
    </section>

    <section class="card">
      <h3 class="card__title">src 目录分层</h3>
      <ul class="layers">
        <li v-for="layer in layers" :key="layer.dir" class="layers__item">
          <code class="layers__dir">src/{{ layer.dir }}</code>
          <span class="layers__desc">{{ layer.desc }}</span>
        </li>
      </ul>
    </section>

    <section class="card">
      <h3 class="card__title">已对接的后端接口</h3>
      <p class="card__desc home__table-desc">
        统一响应体 <code>{ code, message, data }</code>，<code>code = 0</code> 为成功；
        请求层会拆掉这层壳，业务代码直接拿到 <code>data</code>。
      </p>
      <BaseTable :columns="endpointColumns" :data="endpoints" row-key="path">
        <template #cell-method="{ row }">
          <span class="method-tag" :class="`method-tag--${row.method.toLowerCase()}`">{{ row.method }}</span>
        </template>
        <template #cell-path="{ row }">
          <code>{{ row.path }}</code>
        </template>
      </BaseTable>
    </section>
  </div>
</template>

<style scoped>
.home__actions {
  margin-top: var(--space-4);
}

.home__table-desc {
  margin-bottom: var(--space-3);
}

.health {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.health--ok {
  color: var(--color-success);
  background: var(--color-success-soft);
  border-color: #bbf7d0;
}

.health--fail {
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border-color: #fecaca;
}

.health--idle {
  color: var(--color-text-secondary);
  background: #f9fafb;
}

.health__dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
}

.health__text {
  font-weight: 600;
}

.health__meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.health__detail {
  margin-top: var(--space-3);
}

.health__detail--fail {
  color: var(--color-danger);
}

.layers {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.layers__item {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  padding-bottom: var(--space-2);
  border-bottom: 1px dashed var(--color-border);
}

.layers__item:last-child {
  border-bottom: none;
}

.layers__dir {
  flex: 0 0 150px;
  font-size: 13px;
  color: var(--color-primary);
}

.layers__desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.method-tag {
  display: inline-block;
  padding: 1px var(--space-2);
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.method-tag--get {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.method-tag--post {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.method-tag--put {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.method-tag--delete {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

code {
  padding: 1px 4px;
  font-size: 12px;
  background: #f3f4f6;
  border-radius: var(--radius-sm);
}
</style>