<script setup>
import { computed } from 'vue'

/**
 * 通用表格：列配置驱动 + 按列名开作用域插槽。
 *
 *   <BaseTable :columns="columns" :data="list" :loading="loading" row-key="id">
 *     <template #cell-status="{ row }"><StatusTag :status="row.status" /></template>
 *     <template #cell-actions="{ row }"> ... </template>
 *   </BaseTable>
 *
 * columns: [{ key, title, width?, align?, formatter?(row, column) }]
 */
const props = defineProps({
  columns: { type: Array, required: true },
  data: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无数据' }
})

const showEmpty = computed(() => !props.loading && props.data.length === 0)

function cellWidth(column) {
  if (!column.width) return undefined
  return typeof column.width === 'number' ? `${column.width}px` : column.width
}

function cellText(row, column) {
  if (typeof column.formatter === 'function') return column.formatter(row, column)
  const value = row[column.key]
  return value === null || value === undefined || value === '' ? '-' : value
}
</script>

<template>
  <div class="base-table__wrapper">
    <table class="base-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: cellWidth(column), textAlign: column.align || 'left' }"
          >
            {{ column.title }}
          </th>
        </tr>
      </thead>

      <tbody>
        <!-- v-for 必须绑 key；data 是对象数组，取属性时用 ?. 兜底，避免后端省略 null 字段时报错 -->
        <tr v-for="row in data" :key="row[rowKey]">
          <td
            v-for="column in columns"
            :key="column.key"
            :style="{ textAlign: column.align || 'left' }"
          >
            <slot :name="`cell-${column.key}`" :row="row" :column="column" :value="row[column.key]">
              {{ cellText(row, column) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="loading" class="base-table__mask">加载中…</div>
    <div v-else-if="showEmpty" class="base-table__empty">{{ emptyText }}</div>
  </div>
</template>

<style scoped>
.base-table__wrapper {
  position: relative;
  min-height: 140px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.base-table {
  font-size: 14px;
}

.base-table th {
  padding: var(--space-3) var(--space-4);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: #fafbfc;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.base-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid #f1f3f5;
}

.base-table tbody tr:last-child td {
  border-bottom: none;
}

.base-table tbody tr:hover {
  background: #fafbfc;
}

.base-table__mask,
.base-table__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--color-text-muted);
}

.base-table__mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
}
</style>