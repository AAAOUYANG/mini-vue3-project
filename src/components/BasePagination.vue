<script setup>
import { computed, ref } from 'vue'

import { toNumber } from '@/utils/format'

/**
 * 通用分页：只负责"渲染 + 抛事件"，不自己发请求（请求统一在 store 的 actions 里）。
 *   <BasePagination
 *     :page-num="userStore.pageNum" :page-size="userStore.pageSize" :total="userStore.total"
 *     @change="userStore.changePage" @size-change="userStore.changePageSize" />
 */
const props = defineProps({
  pageNum: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  pages: { type: Number, default: 0 },
  pageSizeOptions: { type: Array, default: () => [5, 10, 20, 50] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['change', 'size-change'])

const jumpValue = ref('')

/** 总页数：后端 PageResult 有 pages，没有时本地兜底算一份 */
const totalPages = computed(() => {
  if (props.pages > 0) return props.pages
  if (props.pageSize <= 0) return 1
  return Math.max(1, Math.ceil(props.total / props.pageSize))
})

/** 页码序列，超过 7 页时用 ... 折叠，避免页码按钮撑爆一行 */
const pageItems = computed(() => {
  const last = totalPages.value
  const current = props.pageNum

  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const items = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)

  if (start > 2) items.push('...')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < last - 1) items.push('...')
  items.push(last)

  return items
})

const isFirstPage = computed(() => props.pageNum <= 1)
const isLastPage = computed(() => props.pageNum >= totalPages.value)

function goTo(page) {
  if (props.disabled) return
  const target = Math.min(Math.max(toNumber(page, 1), 1), totalPages.value)
  if (target === props.pageNum) return
  emit('change', target)
}

function handleSizeChange(event) {
  emit('size-change', toNumber(event.target.value, props.pageSize))
}

function handleJump() {
  const value = toNumber(jumpValue.value, NaN)
  jumpValue.value = ''
  if (Number.isNaN(value)) return
  goTo(value)
}
</script>

<template>
  <div class="pagination">
    <span class="pagination__total">共 {{ total }} 条 / {{ totalPages }} 页</span>

    <label class="pagination__size">
      每页
      <select class="select" :value="pageSize" :disabled="disabled" @change="handleSizeChange">
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
      </select>
      条
    </label>

    <div class="pagination__pages">
      <button class="pagination__item" type="button" :disabled="disabled || isFirstPage" @click="goTo(pageNum - 1)">
        上一页
      </button>

      <template v-for="(item, index) in pageItems" :key="`${item}-${index}`">
        <span v-if="item === '...'" class="pagination__ellipsis">…</span>
        <button
          v-else
          class="pagination__item"
          :class="{ 'pagination__item--active': item === pageNum }"
          type="button"
          :disabled="disabled"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>

      <button class="pagination__item" type="button" :disabled="disabled || isLastPage" @click="goTo(pageNum + 1)">
        下一页
      </button>
    </div>

    <label class="pagination__jump">
      跳至
      <input
        v-model="jumpValue"
        class="input pagination__jump-input"
        type="text"
        inputmode="numeric"
        :disabled="disabled"
        @keyup.enter="handleJump"
      />
      页
    </label>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  margin-top: var(--space-4);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.pagination__size,
.pagination__jump {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
}

.pagination__size .select {
  height: 28px;
  padding: 0 var(--space-1);
}

.pagination__pages {
  display: flex;
  gap: var(--space-1);
  margin-left: auto;
}

.pagination__item {
  min-width: 30px;
  height: 30px;
  padding: 0 var(--space-2);
  color: var(--color-text);
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pagination__item:hover:not(:disabled) {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.pagination__item:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.pagination__item--active,
.pagination__item--active:hover {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.pagination__ellipsis {
  padding: 0 var(--space-1);
}

.pagination__jump-input {
  width: 48px;
  height: 28px;
  padding: 0 var(--space-1);
  text-align: center;
}
</style>