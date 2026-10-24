<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import BaseButton from '@/components/BaseButton.vue'
import BaseDialog from '@/components/BaseDialog.vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseTable from '@/components/BaseTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import useScrollListener from '@/hooks/useScrollListener'
import useToast from '@/hooks/useToast'
import useUserStore, { PAGE_SIZE_OPTIONS } from '@/store/modules/user'
import UserForm from './components/UserForm.vue'
import UserSearchBar from './components/UserSearchBar.vue'

/**
 * 用户管理页：把"查询条件 / 列表 / 分页 / 新增编辑弹窗 / 删除确认"组装起来。
 * 这里不出现 axios，也不出现接口地址——所有请求都通过 userStore 的 actions 完成。
 */
const userStore = useUserStore()
const toast = useToast()

const columns = [
  { key: 'id', title: 'ID', width: 70 },
  { key: 'username', title: '登录名', width: 140 },
  { key: 'nickname', title: '昵称', width: 140 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'createdAt', title: '创建时间', width: 170 },
  { key: 'updatedAt', title: '更新时间', width: 170 },
  { key: 'actions', title: '操作', width: 140, align: 'right' }
]

/** 列表加载失败（最常见的是后端没启动）：单独提示，不跟"暂无数据"混在一起 */
const loadError = ref('')

/** 滚动容器：滚到底部追加下一页，用的是 hooks/useScrollListener */
const scrollerRef = ref(null)
const { isBottom, recompute } = useScrollListener(scrollerRef)

/** 分页方式开关：page 翻页 / append 滚动加载更多（交给 store 切换并重新取数） */
const appendMode = computed({
  get: () => userStore.isAppendMode,
  set: (value) => {
    userStore.setMode(value ? 'append' : 'page').catch((error) => {
      loadError.value = error.message
    })
  }
})

/** 新增 / 编辑弹窗 */
const dialogVisible = ref(false)
const dialogMode = ref('create')
const editingRow = ref(null)
const userFormRef = ref(null)

/** 删除二次确认 */
const confirmVisible = ref(false)
const pendingDelete = ref(null)

async function run(action) {
  loadError.value = ''
  try {
    await action()
  } catch (error) {
    loadError.value = error.message
  }
}

function handleSearch() {
  return run(() => userStore.search())
}

function handleReset() {
  return run(() => userStore.resetQuery())
}

function handleRefresh() {
  return run(() => userStore.fetchUserPage())
}

function handlePageChange(pageNum) {
  return run(() => userStore.changePage(pageNum))
}

function handlePageSizeChange(pageSize) {
  return run(() => userStore.changePageSize(pageSize))
}

/** 滚到底部：追加下一页（只有在"加载更多"模式、还有数据、当前没在请求时才触发） */
function handleLoadMore() {
  userStore.loadMore().catch((error) => toast.error(error.message))
}

function openCreate() {
  dialogMode.value = 'create'
  editingRow.value = null
  dialogVisible.value = true
}

async function openEdit(row) {
  dialogMode.value = 'edit'
  editingRow.value = row
  dialogVisible.value = true
  try {
    // 列表数据可能是旧的，编辑前取一次详情；失败就退回用行内数据
    const detail = await userStore.fetchUserDetail(row.id)
    if (detail) editingRow.value = { ...row, ...detail }
  } catch (error) {
    toast.error(`获取详情失败，已使用列表数据：${error.message}`)
  }
}

/** 弹窗底部"确定"：先让表单校验，通过后再转交 store */
async function handleDialogConfirm() {
  const payload = userFormRef.value?.validate()
  if (!payload) return

  try {
    if (dialogMode.value === 'edit') {
      await userStore.updateUser(editingRow.value.id, payload)
    } else {
      await userStore.createUser(payload)
    }
    dialogVisible.value = false
  } catch (error) {
    // 失败时保持弹窗打开，用户改完可以重试
    toast.error(error.message)
  }
}

function openDeleteConfirm(row) {
  pendingDelete.value = row
  confirmVisible.value = true
}

async function handleDeleteConfirm() {
  const row = pendingDelete.value
  if (!row) return
  try {
    await userStore.deleteUser(row.id)
    confirmVisible.value = false
    pendingDelete.value = null
  } catch (error) {
    toast.error(error.message)
  }
}

watch(isBottom, (bottom) => {
  if (!bottom || !userStore.isAppendMode) return
  if (userStore.listLoading || userStore.submitting) return
  if (!userStore.hasMore) return
  handleLoadMore()
})

/**
 * 容器高度会随数据变化，而"数据变化"本身不会触发 scroll 事件，
 * 所以每次列表/总数变化后都重算一次 isBottom，保证"从没撑满 -> 撑满"时状态能回落。
 */
watch(
  () => [userStore.list.length, userStore.total],
  async () => {
    await nextTick()
    recompute()
  }
)

onMounted(() => {
  handleRefresh()
})
</script>

<template>
  <div class="user-list">
    <section class="card">
      <h2 class="card__title">用户管理</h2>
      <p class="card__desc">
        对应后端 <code>sys_user</code> 表（<code>/user/**</code>）。删除是软删除：后端把
        <code>deleted</code> 置 1，列表查询会自动过滤掉已删除的行。
      </p>

      <div class="user-list__search">
        <UserSearchBar :query="userStore.query" :loading="userStore.listLoading" @search="handleSearch" @reset="handleReset" />
      </div>

      <div class="user-list__toolbar">
        <BaseButton type="primary" @click="openCreate">新增用户</BaseButton>
        <BaseButton :loading="userStore.listLoading" @click="handleRefresh">刷新</BaseButton>

        <label class="user-list__auto-load">
          <input v-model="appendMode" type="checkbox" />
          滚动到底部加载更多
        </label>

        <span class="user-list__count">共 {{ userStore.total }} 条</span>
      </div>

      <p v-if="loadError" class="user-list__error">
        {{ loadError }}
        <BaseButton type="text" size="small" @click="handleRefresh">重试</BaseButton>
      </p>

      <div ref="scrollerRef" class="user-list__scroller">
        <BaseTable
          :columns="columns"
          :data="userStore.list"
          :loading="userStore.listLoading"
          :empty-text="loadError ? '加载失败' : '暂无数据'"
          row-key="id"
        >
          <template #cell-status="{ row }">
            <StatusTag :status="row.status" />
          </template>

          <template #cell-nickname="{ row }">{{ row.nickname || '-' }}</template>

          <template #cell-actions="{ row }">
            <div class="user-list__actions">
              <BaseButton type="text" size="small" @click="openEdit(row)">编辑</BaseButton>
              <BaseButton type="text" size="small" @click="openDeleteConfirm(row)">删除</BaseButton>
            </div>
          </template>
        </BaseTable>
      </div>

      <BasePagination
        v-if="!appendMode"
        :page-num="userStore.pageNum"
        :page-size="userStore.pageSize"
        :total="userStore.total"
        :pages="userStore.pages"
        :page-size-options="PAGE_SIZE_OPTIONS"
        :disabled="userStore.listLoading"
        @change="handlePageChange"
        @size-change="handlePageSizeChange"
      />

      <!-- 追加模式：列表里累积已加载的数据，用"加载更多"代替页码 -->
      <div v-else class="user-list__load-more">
        <span class="card__desc">已加载 {{ userStore.list.length }} / {{ userStore.total }} 条</span>
        <BaseButton v-if="userStore.hasMore" :loading="userStore.listLoading" @click="handleLoadMore">
          加载更多
        </BaseButton>
        <span v-else class="card__desc">已经到底了</span>
      </div>
    </section>

    <BaseDialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit' ? '编辑用户' : '新增用户'"
      :confirm-loading="userStore.submitting"
      @confirm="handleDialogConfirm"
    >
      <UserForm
        ref="userFormRef"
        :visible="dialogVisible"
        :mode="dialogMode"
        :user="editingRow"
        :submitting="userStore.submitting"
        @submit="handleDialogConfirm"
      />
    </BaseDialog>

    <BaseDialog
      v-model="confirmVisible"
      title="删除确认"
      :confirm-loading="userStore.submitting"
      confirm-text="确认删除"
      @confirm="handleDeleteConfirm"
    >
      <p>
        确定要删除用户
        <strong>{{ pendingDelete?.nickname || pendingDelete?.username }}</strong>
        吗？
      </p>
      <p class="card__desc user-list__confirm-tip">
        后端执行的是软删除（只把 deleted 置 1），数据行仍然保留在库里。
      </p>
    </BaseDialog>
  </div>
</template>

<style scoped>
.user-list__search {
  padding: var(--space-4) 0;
}

.user-list__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  padding-bottom: var(--space-3);
}

.user-list__auto-load {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.user-list__count {
  margin-left: auto;
  font-size: 13px;
  color: var(--color-text-muted);
}

.user-list__error {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
}

.user-list__scroller {
  max-height: 440px;
  overflow-y: auto;
}

.user-list__scroller :deep(.base-table th) {
  position: sticky;
  top: 0;
  z-index: 1;
}

.user-list__actions {
  display: flex;
  gap: var(--space-1);
  justify-content: flex-end;
}

.user-list__confirm-tip {
  margin-top: var(--space-2);
}

.user-list__load-more {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding-top: var(--space-4);
}

code {
  padding: 1px 4px;
  font-size: 12px;
  background: #f3f4f6;
  border-radius: var(--radius-sm);
}
</style>