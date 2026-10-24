<script setup>
import BaseButton from '@/components/BaseButton.vue'

/**
 * 查询条件栏：只负责收集条件，不自己发请求。
 * query 是 store 里的响应式对象（父组件直接透传），子组件改字段、父组件决定什么时候查询。
 */
defineProps({
  query: { type: Object, required: true },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['search', 'reset'])
</script>

<template>
  <form class="search-bar" @submit.prevent="emit('search')">
    <label class="field search-bar__field">
      <span class="field__label">登录名</span>
      <input v-model="query.username" class="input" type="text" placeholder="支持模糊匹配" />
    </label>

    <label class="field search-bar__field">
      <span class="field__label">昵称</span>
      <input v-model="query.nickname" class="input" type="text" placeholder="支持模糊匹配" />
    </label>

    <label class="field search-bar__field search-bar__field--small">
      <span class="field__label">状态</span>
      <select v-model="query.status" class="select">
        <option value="">全部</option>
        <option :value="1">启用</option>
        <option :value="0">禁用</option>
      </select>
    </label>

    <div class="search-bar__actions">
      <BaseButton type="primary" :loading="loading" @click="emit('search')">查询</BaseButton>
      <BaseButton :disabled="loading" @click="emit('reset')">重置</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
}

.search-bar__field {
  flex: 1 1 200px;
  min-width: 160px;
}

.search-bar__field--small {
  flex: 0 0 120px;
}

.search-bar__actions {
  display: flex;
  gap: var(--space-2);
}
</style>