/**
 * 表单校验：只做纯函数校验，返回 { valid, errors }，由调用方决定怎么展示。
 * 后端当前没有给 UserDTO 加校验注解，所以前端这一层是唯一的口径，规则对齐数据库字段长度：
 * username / password / nickname 都是 varchar(64)，这里按产品口径收得更紧一些。
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/
export const PASSWORD_MIN_LENGTH = 6

export function validateUserForm(form = {}, { isEdit = false } = {}) {
  const errors = {}

  const username = (form.username ?? '').trim()
  if (!username) {
    errors.username = '登录名不能为空'
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = '登录名需为 3-20 位字母、数字或下划线'
  }

  const password = form.password ?? ''
  if (!isEdit && !password) {
    errors.password = '密码不能为空'
  } else if (password && password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `密码至少 ${PASSWORD_MIN_LENGTH} 位`
  }

  const nickname = (form.nickname ?? '').trim()
  if (nickname && nickname.length > 20) {
    errors.nickname = '昵称最长 20 个字符'
  }

  if (![0, 1].includes(Number(form.status))) {
    errors.status = '请选择状态'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}