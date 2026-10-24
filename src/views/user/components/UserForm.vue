<script setup>
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/BaseButton.vue'
import { validateUserForm } from '@/utils/validate'

/**
 * 用户表单：新增 / 编辑共用。
 *
 * 职责边界：组件只做"收集 + 校验 + 抛出 submit 事件"，
 * 具体调哪个接口、成功后怎么刷新列表由父组件（页面）转交给 store 的 actions。
 */
const props = defineProps({
  visible: { type: Boolean, default: false },
  /** create | edit */
  mode: { type: String, default: 'create' },
  /** 编辑时传入的行数据；新增时为 null */
  user: { type: Object, default: null },
  submitting: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const form = reactive({ username: '', password: '', nickname: '', status: 1 })
const errors = ref({})

const isEdit = computed(() => props.mode === 'edit')
const title = computed(() => (isEdit.value ? '编辑用户' : '新增用户'))

function resetForm() {
  errors.value = {}
  if (props.user) {
    form.username = props.user.username ?? ''
    form.nickname = props.user.nickname ?? ''
    form.status = Number(props.user.status ?? 1)
  } else {
    form.username = ''
    form.nickname = ''
    form.status = 1
  }
  // 密码永远不回填：后端 @JsonProperty(WRITE_ONLY) 不会把密码返回给前端
  form.password = ''
}

// 弹窗打开、或打开后详情异步回来（props.user 换了对象）都要重新填表
watch([() => props.visible, () => props.user], ([visible]) => {
  if (visible) resetForm()
})

/**
 * 校验并返回提交体；不通过时返回 null。
 * 通过 defineExpose 暴露出去，弹窗底部的"确定"按钮由父组件调用它，
 * 这样"校验口径"只存在于表单组件内部，父组件不需要了解任何字段规则。
 */
function validate() {
  const result = validateUserForm(form, { isEdit: isEdit.value })
  errors.value = result.errors
  if (!result.valid) return null

  return {
    username: form.username,
    password: form.password,
    nickname: form.nickname,
    status: Number(form.status)
  }
}

/** 表单内回车提交 */
function handleSubmit() {
  const payload = validate()
  if (payload) emit('submit', payload)
}

defineExpose({ validate })
</script>

<template>
  <form class="user-form" @submit.prevent="handleSubmit">
    <label class="field">
      <span class="field__label">登录名 <em class="user-form__required">*</em></span>
      <input
        v-model="form.username"
        class="input"
        :class="{ 'input--invalid': errors.username }"
        type="text"
        placeholder="3-20 位字母、数字或下划线"
      />
      <span class="field__error">{{ errors.username }}</span>
    </label>

    <label class="field">
      <span class="field__label">
        密码 <em v-if="!isEdit" class="user-form__required">*</em>
        <span v-else class="user-form__hint">（留空表示不修改）</span>
      </span>
      <input
        v-model="form.password"
        class="input"
        :class="{ 'input--invalid': errors.password }"
        type="password"
        autocomplete="new-password"
        :placeholder="isEdit ? '不填则保持原密码' : '至少 6 位'"
      />
      <span class="field__error">{{ errors.password }}</span>
    </label>

    <label class="field">
      <span class="field__label">昵称</span>
      <input
        v-model="form.nickname"
        class="input"
        :class="{ 'input--invalid': errors.nickname }"
        type="text"
        placeholder="选填，最长 20 个字符"
      />
      <span class="field__error">{{ errors.nickname }}</span>
    </label>

    <label class="field">
      <span class="field__label">状态</span>
      <select v-model="form.status" class="select" :class="{ 'select--invalid': errors.status }">
        <option :value="1">启用</option>
        <option :value="0">禁用</option>
      </select>
      <span class="field__error">{{ errors.status }}</span>
    </label>

    <!-- 表单在弹窗内，真正的提交按钮由弹窗底部提供，这里用一个隐藏按钮承接回车提交 -->
    <button class="user-form__submit-proxy" type="submit" :disabled="submitting">提交</button>
  </form>
</template>

<style scoped>
.user-form {
  display: grid;
  gap: var(--space-2);
}

.user-form__required {
  color: var(--color-danger);
  font-style: normal;
}

.user-form__hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.user-form__submit-proxy {
  display: none;
}
</style>