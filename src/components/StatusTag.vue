<script setup>
import { computed } from 'vue'

import { statusText } from '@/utils/format'

/** 状态标签：后端约定 status 1 启用 / 0 禁用 */
const props = defineProps({
  status: { type: [Number, String], default: null }
})

const text = computed(() => statusText(props.status))
const modifier = computed(() => {
  if (Number(props.status) === 1) return 'enabled'
  if (Number(props.status) === 0) return 'disabled'
  return 'unknown'
})
</script>

<template>
  <span class="status-tag" :class="`status-tag--${modifier}`">{{ text }}</span>
</template>

<style scoped>
.status-tag {
  display: inline-block;
  padding: 1px var(--space-2);
  font-size: 12px;
  line-height: 18px;
  border-radius: 999px;
}

.status-tag--enabled {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.status-tag--disabled {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.status-tag--unknown {
  color: var(--color-text-secondary);
  background: #f3f4f6;
}
</style>