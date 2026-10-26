import hyRequest from '@/services/request'

/**
 * 用户模块接口（对接 mini-spring-cloud-project 的 mini-user-service，服务内前缀 /user；
 * 浏览器发的是 /api/user/**，/api 前缀由网关的 StripPrefix 去掉）。
 *
 * 这一层只写"接口地址 + 参数"，不做业务判断、不碰 store：
 * 后端路由的增删改查全在这里对齐，store 的 actions 只调用这里导出的函数。
 *
 * | 方法 | 路由            | 入参                     | 返回                        |
 * |------|-----------------|--------------------------|-----------------------------|
 * | GET  | /user/page      | pageNum、pageSize + 条件  | PageResult<UserDTO>         |
 * | GET  | /user/list      | 条件                     | UserDTO[]                   |
 * | GET  | /user/{id}      | 路径 id                  | UserDTO（查不到时 data 被省略 => undefined）|
 * | POST | /user/save      | UserDTO                  | UserDTO                     |
 * | PUT  | /user/{id}      | 路径 id + UserDTO         | UserDTO                     |
 * | DELETE | /user/{id}    | 路径 id                  | Boolean（软删除）            |
 */

/** 分页查询：{ records, total, pageNum, pageSize, pages } */
export function getUserPage(params) {
  return hyRequest.get({ url: '/user/page', params })
}

/** 条件查询列表（不分页） */
export function getUserList(params) {
  return hyRequest.get({ url: '/user/list', params })
}

/** 详情 */
export function getUserDetail(id) {
  return hyRequest.get({ url: `/user/${id}` })
}

/** 新增 */
export function createUser(data) {
  return hyRequest.post({ url: '/user/save', data })
}

/** 修改（主键走路径，body 里只传要改的字段；password 为空时不会传，后端 updateById 忽略 null） */
export function updateUser(id, data) {
  return hyRequest.put({ url: `/user/${id}`, data })
}

/** 删除：后端是软删除（deleted 置 1），返回是否删除成功 */
export function removeUser(id) {
  return hyRequest.delete({ url: `/user/${id}` })
}