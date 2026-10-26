# mini-vue3-project

层次分明的 Vue3 极简项目，架构参考掘金文章 [《项目篇: 思路清晰的 Vue3 项目架构设计及复盘》](https://juejin.cn/post/7227401803724767293)：
按 **资源 / 复用组件 / 逻辑(hooks) / 请求 / 状态 / 路由 / 页面** 分层，每层只做一件事。

后端对接同目录下的 **[mini-spring-cloud-project](../mini-spring-cloud-project)**（Spring Cloud 微服务：
`mini-gateway` 网关 + `mini-user-service` + `mini-order-service`，Nacos 注册/配置中心 + MySQL）。
两种形态都支持：**本地开发**用 `npm run dev` 直连网关 `http://localhost:9000`；**部署形态**把前端跑在
nginx 容器里（见 §七），后端地址由容器启动时从 Nacos 取。

技术栈：`vue 3` + `vite` + `vue-router 4` + `pinia` + `axios`（不引 UI 组件库，样式用原生 CSS + 全局变量，保持"极简"）。

---

## 一、快速开始

前端有两种跑法，**按需二选一**：本地开发（Vite dev server）和容器化部署（nginx，见 §七）。
两者依赖**同一个后端项目 mini-spring-cloud-project**——网关是唯一入口，前端只认 `http://localhost:9000`。

### 1. 先起后端（mini-spring-cloud-project）

它就是同目录下的 `../mini-spring-cloud-project`，提供 Nacos / MySQL / 网关 / 用户服务 / 订单服务。
最省事的起法（基础设施 + 三个应用全容器化）：

```bash
cd ../mini-spring-cloud-project

# ① 基础设施：MySQL(13306) + Nacos(8848) + Jenkins(8080) + Portainer(9001)
#    首次需要 cp .env.example .env 并把 WORKSPACE_DIR 改成仓库根目录绝对路径
cd docker/infra && docker compose up -d
cd ../..

# ② 三个应用：网关(9000) + 用户服务(18081) + 订单服务(18082)
APP_ENV=dev IMAGE_TAG=local docker compose -f docker/app/docker-compose.yml up -d
```

只改后端代码、想快速重启时，可以只把基础设施放容器、三个应用在 IDE 里跑（cloud 项目 README 的「方式 A 混合模式」）。

起来后经网关查用户应该返回 `{"code":0,...}`：

```bash
curl "http://localhost:9000/api/user/page?pageNum=1&pageSize=1"
```

> ⚠️ 网关的对外路由本身就是 `/api/user/**`（去前缀由网关自己的 StripPrefix 做），所以**路径必须带 `/api` 前缀**。

### 2. 再起前端（本地开发）

```bash
npm install
npm run dev                   # http://localhost:5300
```

默认就是「**网关 + 保留 `/api` 前缀**」，与容器化部署的链路一致，**不需要额外传环境变量**。
要覆盖默认值（都在 `vite.config.js` 里）：

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `BACKEND_ORIGIN` | `http://localhost:9000`（网关） | 代理目标 |
| `BACKEND_KEEP_API_PREFIX` | `true`（保留） | 设为 `false` 才删前缀，用于**绕过网关直连某个服务** |
| `DEV_PORT` / `PREVIEW_PORT` | `5300` / `5301` | 端口 |

```bash
# 例：绕开网关，直连用户服务（它的路由是 /user/**，所以要删掉 /api）
BACKEND_ORIGIN=http://127.0.0.1:18081 BACKEND_KEEP_API_PREFIX=false npm run dev
```

打开首页会看到「后端连通性自检」卡片：连上了会显示用户总数与探测耗时，没连上会给出具体原因和启动命令。

```bash
npm run build                 # 产物在 dist/
npm run preview               # 预览构建产物：http://localhost:5301
```

端口对照表（**别走错端口，走错就是 404**）：

| 端口 | 是什么 | 怎么起 |
| --- | --- | --- |
| `5300` | 前端 dev server（带 HMR），日常开发用这个 | 本项目 `npm run dev` |
| `5301` | 前端 preview（跑 `dist/` 产物，**不是** dev server） | 本项目 `npm run preview` |
| `9000` | **网关 mini-gateway：前端唯一要连的后端入口**（纯 API，根路径 `/` 返回 404 是正常的） | cloud 项目 `docker/app` |
| `8848` | Nacos —— 前端的后端地址就存在这里（`mini-frontend.yaml`） | cloud 项目 `docker/infra` |
| `13306` | MySQL 容器（`root/root`，库 `mini_spring_boot`） | cloud 项目 `docker/infra` |
| `18081` / `18082` | 用户服务 / 订单服务（排查时直连用，正常请求走网关） | cloud 项目 `docker/app` |
| `8080` | **Jenkins**（⚠️ 不是后端！cloud 项目已把 8080 分给 Jenkins） | cloud 项目 `docker/infra` |
| `9001` | Portainer（容器可视化，排查部署问题很有用） | cloud 项目 `docker/infra` |

> **为什么不用 Vite 默认的 5173/5174**：本机 517x 这段被其他工具占用（是一个 Vite 实例，但它不是这个项目的，
> 它的 root 里没有 `index.html`、也没加载本项目的 `vite.config.js`，所以访问 `/` 只会得到一个空 body 的 404）。
> 用默认端口时很容易出现"打开 5173 是 404，其实服务在别的端口"。要换端口用环境变量：
>
> ```bash
> DEV_PORT=5300 PREVIEW_PORT=5301 npm run dev
> ```
>
> 判断某个端口上到底是谁：`curl -i http://localhost:5300/` —— 返回 200 才是本项目（`Content-Type: text/html`）。

> 另外：Vite 的 `preview` **不继承** `server.proxy`，所以 `vite.config.js` 里把代理抽成了 `apiProxy`，
> `server` 和 `preview` 都挂了一遍。只配 `server.proxy` 时，`npm run preview` 页面能打开、`/api/**` 却会 404。

> 如果 `npm install` 报 `EPERM ... ~/.npm/_cacache`，说明 npm 全局缓存目录权限有问题，
> 可以用本地缓存绕开：`npm install --cache ./.npm-cache`。

---

## 二、目录结构（分层）

```text
mini-vue3-project
├── index.html
├── vite.config.js                 # 别名 @ -> src；开发代理 /api -> 网关 9000（默认保留 /api 前缀）
├── .env.development / .env.production
└── src
    ├── main.js                    # 先 use(pinia)，再 use(router)，最后 mount
    ├── App.vue                    # 根组件：只放全局进度条、轻提示
    ├── assets/                    # 统一资源：全局样式 + 颜色变量
    │   └── styles/variables.css   #   :root 里定义 --color-* / --space-*，组件用 var() 取
    ├── components/                # 跨页面复用组件（不含业务逻辑）
    │   ├── BaseButton.vue         #   按钮：type / loading / disabled
    │   ├── BaseDialog.vue         #   弹窗：v-model 控制显隐 + footer 插槽
    │   ├── BaseTable.vue          #   表格：列配置驱动 + cell-xxx 作用域插槽
    │   ├── BasePagination.vue     #   分页：只渲染+抛事件，不自己发请求
    │   ├── StatusTag.vue          #   状态标签：1 启用 / 0 禁用
    │   ├── ToastMessage.vue       #   全局轻提示（挂载一次）
    │   └── LoadingBar.vue         #   全局请求进度条
    ├── hooks/                     # 可复用逻辑（组合式函数）
    │   ├── useScrollListener.js   #   滚动监听：是否触底 / scrollTop（带 1px 容差）
    │   └── useToast.js            #   提示语收口：info / success / error
    ├── router/index.js            # 路由表：布局作父路由，页面组件懒加载
    ├── services/                  # 网络请求层
    │   ├── index.js               #   分拣站：统一 re-export 各模块接口
    │   ├── request/config.js      #   BASE_URL / TIME_OUT / SUCCESS_CODE
    │   ├── request/index.js       #   HyRequest 请求类 + 拦截器（维护全局 loading）
    │   └── modules/user.js        #   用户模块接口：路由、参数、返回
    ├── store/                     # 状态管理层
    │   ├── index.js               #   createPinia()
    │   └── modules/
    │       ├── main.js            #   全局：pendingCount(-> isLoading)、toast
    │       ├── user.js            #   用户：列表 / 分页 / 条件 / 增删改查 actions
    │       └── health.js          #   首页自检：后端连通性探测
    ├── utils/                     # 纯函数工具（不依赖 Vue、不依赖 store）
    │   ├── format.js              #   statusText / compactQuery / compactPayload / toNumber
    │   ├── validate.js            #   表单校验规则
    │   ├── error.js               #   错误归一化成一句中文文案
    │   └── performance.js         #   throttle（手写，避免为一个小函数引入 underscore）
    └── views/                     # 页面
        ├── layout/AppLayout.vue   #   顶部导航 + 内容区（父路由组件）
        ├── home/Home.vue          #   首页：自检 + 架构说明 + 接口清单
        ├── user/
        │   ├── UserList.vue       #   用户管理主页面
        │   └── components/        #   该页面专属的子组件
        │       ├── UserSearchBar.vue
        │       └── UserForm.vue
        └── error/NotFound.vue     #   404
```

另外有一个 `verify/` 目录（不在 `src` 里，是给这个项目做的端到端验证脚本，见文末第六节）：

```text
verify
├── verify_crud.py            # 增删改查 / 查询 / 校验 / 404（Playwright 驱动真实浏览器 + 真实后端）
├── verify_pagination.py      # 翻页 / 每页条数 / 滚动加载更多
├── seed_pagination.sh        # 分页用例的数据准备与物理清理
└── screenshots/              # 验证时留下的截图
```

### 数据是怎么流动的

```text
页面(view)  ──调用 action──▶  store/modules/user.js  ──调用接口函数──▶  services/modules/user.js
    ▲                                   │                                      │
    │                                   │ 失败 throw / 成功 showToast          ▼
    └────────── 响应式 state ◀──────────┘                          services/request（拦截器 + 拆包）
                                                                               │
                                                                               ▼
                                                                   后端 ApiResponse { code, message, data }
```

三条硬约定（照着写就不会乱）：

1. **组件里不出现 axios，也不出现接口地址**：页面只调 store 的 action；
2. **接口地址只写在 `services/modules/*`**：store 不关心 URL 长什么样；
3. **纯计算放进 `utils/`，可复用副作用放进 `hooks/`**：两边都不碰状态。

### 列表的两种取数方式

用户列表同时演示了两种分页，切换开关在工具栏上（`userStore.mode`）：

| 模式 | 行为 | 实现 |
| --- | --- | --- |
| `page`（默认） | 页码/每页条数/跳页，切页时**替换**列表 | `changePage` / `changePageSize` → `fetchUserPage()` 里 `this.list = records` |
| `append` | 隐藏分页器，滚到底部**追加**下一页 | `useScrollListener` 的 `isBottom` → `loadMore()` 里 `this.list.push(...records)` |

两种模式都回到第 1 页重新取数，避免"翻到第 3 页再切模式"出现页码错乱。

`useScrollListener` 这里有个容易踩的坑，代码和注释里都标了：列表刚挂载时还没有数据、容器撑不满，
此时 `isBottom` 已经是 `true`；等数据回来把容器撑高，并**不会**触发 scroll 事件，
于是 `isBottom` 一直是 `true`，用户真正滚到底部时"没有变化"，`watch` 就不会执行。
所以 hook 额外导出了 `recompute()`，在列表数据变化后（`nextTick` 之后）手动重算一次。

---

## 三、和后端的对接约定

后端统一响应体是 `ApiResponse`，成功时 `code = 0`：

```json
{ "code": 0, "message": "ok", "data": { "id": 1, "username": "alice", "nickname": "Alice", "status": 1 } }
```

请求层（`services/request/index.js`）做了两件事：**拆掉这层壳**（业务代码直接拿到 `data`）、
**失败时 reject 出后端 `message`**（`code !== 0` 或 HTTP 4xx/5xx 都走这里）。

已对接的接口（下表是**用户服务内部**的路由，前缀 `/user`；浏览器一律发 `/api/user/**`，
`/api` 前缀由网关的 StripPrefix 去掉 —— 见 §七）：

| 方法 | 路由 | 入参 | 返回 | 前端位置 |
| --- | --- | --- | --- | --- |
| GET | `/user/page` | `pageNum`、`pageSize` + 条件 | `PageResult<UserDTO>` | 列表 `fetchUserPage` |
| GET | `/user/list` | 查询条件 | `List<UserDTO>` | `getUserList` |
| GET | `/user/{id}` | 路径 `id` | `UserDTO` | 编辑前取详情 |
| POST | `/user/save` | `UserDTO`（含 `password`） | `UserDTO` | 新增 |
| PUT | `/user/{id}` | 路径 `id` + 要改的字段 | `UserDTO` | 编辑 |
| DELETE | `/user/{id}` | 路径 `id` | `Boolean` | 删除（软删除） |

几个已经踩过、代码里也处理了的点：

- **跨域**：后端没有配 CORS，所以开发期走 Vite 代理。代理目标默认就是**网关 `http://localhost:9000`**，
  且默认**保留** `/api` 前缀（与网关路由一致），所以 `npm run dev` 开箱即通。
  想绕过代理直连后端，把 `.env.development` 的 `VITE_API_BASE_URL` 改成绝对地址，
  同时给后端加 `@CrossOrigin` 或全局 CORS 配置。
- **走网关时不能 rewrite `/api`**：网关对外路由本身就是 `/api/user/**`，去前缀由网关自己的 StripPrefix 做，
  代理层再删一次就会 404。`vite.config.js` 现在**默认保留**前缀（`BACKEND_KEEP_API_PREFIX` 默认 `true`），
  只有显式设成 `false` 才删——那是给"直连某个后端服务"用的（见上一节 §一 的覆盖表）。
- **`password` 是只写字段**：`UserDTO` 上标了 `@JsonProperty(WRITE_ONLY)`，详情/列表接口都不会返回密码，
  所以编辑弹窗的密码框永远留空，留空时前端直接把该字段丢掉（后端 `updateById` 会忽略 `null`，不会清空密码）。
- **`default-property-inclusion: non_null`**：值为 `null` 的字段整个键都不输出，
  所以表格里取属性一律 `row.xxx || '-'` 兜底，`BaseTable` 也内置了 `?.` + `-` 的默认渲染。
- **空串条件**：后端 QueryVO 是 GET 参数绑定，`username=''` 会变成 `like '%%'`，
  语义上是"查全部"但会多一次无意义的条件，所以 `compactQuery` 在发请求前把空值键删掉。
- **软删除**：`DELETE /user/{id}` 只把 `deleted` 置 1，行还在库里；删除当前页最后一条时前端会自动往前翻一页。
- **登录名是全局唯一索引（含已软删除的行）**：库里是 `UNIQUE KEY uk_sys_user_username (username)`，
  而删除只是把 `deleted` 置 1，所以同一个登录名被"删除"后**不能再被新增**；此时后端会抛未捕获的
  `DataIntegrityViolationException`，被 `GlobalExceptionHandler` 兜成 500 `服务器内部错误`，
  前端会原样把这个 message 弹出来。要支持复用登录名，得在后端改成"唯一索引带 deleted 列"或恢复逻辑。
- **后端对 `status` 没有取值约束**：库里是 `TINYINT`，随手写入的 `11` 也能存进去，
  前端 `StatusTag` 对非 0/1 的值统一显示为"未知"，不会渲染出空白。

---

## 四、这个极简项目里刻意保留的"文章同款"

| 文章里的点 | 本项目里的落地 |
| --- | --- |
| `services` 分 `request`（封装类+配置）和 `modules`（各模块接口）+ `index.js` 分拣站 | 完全一致，`HyRequest` 类 + `get/post/put/delete` 语法糖 |
| axios 拦截器里维护全局 `isLoading` | 拦截器改 `mainStore.pendingCount`，`LoadingBar` 只读 `isLoading` |
| store 的 `actions` 里发请求，组件不直接发 | 列表/详情/新增/编辑/删除全在 `userStore` 的 actions 里 |
| 模块化状态管理（`store/modules`） | `main` / `user` / `health` 三个模块，store id 与文件名一致 |
| hooks 封装滚动监听、触底加载 | `useScrollListener`，用户列表可切到"滚动到底部加载更多"模式（追加而不是翻页） |
| 网络请求类的封装 | `HyRequest`（比文章多加了 `put` / `delete`，并修掉了 `get/post` 不拆响应体的返回值不一致问题） |
| 列表数据用 `push(...data)` 追加、防止二维数组 | `userStore.loadMore()` 里 `this.list.push(...records)`，注释写明了为什么不能赋值 |
| 全局 color 封装 | `assets/styles/variables.css` 里 `:root` 定义，组件用 `var()` |
| `v-for` 要绑 key、对象属性要判空 | `BaseTable` 里 `:key` + `row[column.key]` 空值兜底 |
| 网络请求统一在父组件触发 | 首页/列表页在 `onMounted` 里触发，子组件只抛事件 |

补充说明：

- **没有 `mock/`**：文章里用 mock 顶替服务器数据，这里后端是现成的，直接连真接口，
  所以 `services/request/config.js` 里的 `BASE_URL` 走 `.env`；
- **没有引 UI 组件库**：`components/` 下 7 个基础组件足够覆盖这个项目，也更符合"极简"；
- **比文章多的一层是 `utils/error.js`**：把 axios 的 `ERR_NETWORK` / 超时 / HTTP 错误码统一成一句中文，
  这样"后端没启动"在页面上会显示成一条可读提示，而不是 `Network Error`。

---

## 五、可以照着走一遍的手工验证路径

1. 后端未启动时打开首页 → 自检卡片显示「后端未连通」+ 启动命令；
2. 启动后端后点「重新检测后端」→ 显示「后端已连通」和用户总数；
3. 进入「用户管理」→ 列表、分页、条件查询（登录名/昵称模糊、状态下拉）；
4. 新增用户（登录名格式、密码长度会被前端校验拦下）→ 列表自动刷新；
5. 编辑用户（密码留空 = 不改密码）→ 列表自动刷新；
6. 删除用户 → 二次确认 → 软删除后列表里消失；
7. 勾上「滚动到底部加载更多」→ 滚到底部自动追加下一页；
8. 手动改地址到 `#/not-exist` → 404 页；
9. 请求进行中，顶部会出现全局进度条（拦截器统一维护）。

---

## 六、端到端验证（本次交付已跑通）

项目不是只跑了 `npm run build`，而是**真的把后端跑起来**，再用 Playwright 驱动真实 Chromium 走完整流程，
共 50 项断言全部通过、浏览器控制台零报错：

> 本节记录的是**单体后端时期**（`mini-spring-boot-project` + 本机 MySQL 的 `mini_spring_boot` 库）的结果。
> 后端迁到微服务（`mini-spring-cloud-project` + 容器 MySQL）后**界面行为不变**，只是后端地址从 8080 变成网关 9000；
> 迁移后的部署形态验证见 §七。
>
> ⚠️ 这两个脚本的断言**绑定在最初那 2 条活跃行的数据集**上（`共 2 条 / 1 页`、`status=11` 显示"未知"、
> 按 "String" 命中 1 行、按状态=禁用命中 1 行；分页脚本则是 `2 + 9 = 11 条`）。换成别的数据集时
> 失败只会出现在这些**断言**上，属于测试夹具不匹配，不是产品缺陷 —— 脚本头部也写了这个前提。

```bash
# 前置（单体时期）：后端在 8080、前端 npm run dev 在 5300
python3 verify/verify_crud.py            # 阶段 A：30 项
./verify/seed_pagination.sh seed         # 阶段 B 需要 11 条数据
python3 verify/verify_pagination.py      # 阶段 B：20 项
./verify/seed_pagination.sh clean        # 物理清理测试数据（软删除会占着唯一索引）
```

验证到的行为：

| 范围 | 断言内容 |
| --- | --- |
| 首页自检 | 连通状态、请求前缀、耗时、接口清单 6 行 |
| 列表 | 行数与后端 `total` 一致、状态标签、后端脏数据 `status=11` 显示"未知" |
| 查询 | 登录名模糊、状态等值、重置回全量 |
| 表单校验 | 登录名必填/格式、密码必填/长度、校验失败不关闭弹窗 |
| 新增/编辑/删除 | 成功提示、列表自动刷新、编辑前取详情回填、密码永不回填、删除二次确认、删完恢复行数 |
| 分页 | 页码高亮、上一页/下一页禁用态、跳页输入框、每页条数切换、`共 n 条 / m 页` |
| 加载更多 | 追加后行数增长、无重复行、到底提示、切回翻页模式状态复位 |
| 其他 | 404 页、控制台无 error |

验证过程中真实修掉的两个问题（不是环境噪音，是代码缺陷）：

1. **"加载更多"名不副实**：最初滚到底部调的是 `changePage(pageNum + 1)`，会把列表**替换**成下一页而不是追加。
   现在 store 里区分了 `page` / `append` 两种模式，`loadMore()` 用 `push(...records)` 追加（文章里强调的那点）。
2. **首次滚到底部不触发**：容器从"撑不满"变成"撑满"时不产生 scroll 事件，`isBottom` 卡在 `true`，
   `watch` 等不到变化。现在 hook 导出 `recompute()`，列表数据变化后重算一次。

> 说明：验证用的后端是直接用项目里已编译好的 `target/classes` + 本地 Maven 仓库的依赖启动的
> （`java -cp target/classes:$(cat cp.txt) com.example.demo.MiniSpringBootApplication`），
> 没有走 `./mvnw spring-boot:run`。日常开发按第一节的命令启动即可。
> 测试数据（`e2e_*`）已从库里物理删除，验证前后你原有的 5 行数据保持原样。

几个界面截图（`verify/screenshots/`）：

| 首页自检 | 用户列表 |
| --- | --- |
| ![首页](verify/screenshots/01-home.png) | ![列表](verify/screenshots/02-user-list.png) |

| 新增用户 | 删除二次确认 |
| --- | --- |
| ![新增](verify/screenshots/05-created.png) | ![删除确认](verify/screenshots/07-delete-confirm.png) |

| 滚动加载更多（追加模式） |
| --- |
| ![加载更多](verify/screenshots/13-append-after.png) |

---

## 七、容器化部署（nginx + Nacos），配合 mini-spring-cloud-project

前六节是"本机 `npm run dev`"的开发形态。这一节是**部署形态**：前端跑在 nginx 容器里，
**后端地址不写在代码里、也不写在镜像里，而是放在 Nacos 配置中心**，由容器启动时取。

### 1. 和 mini-spring-cloud-project 是怎么配合的

⚠️ 前端容器**不是自包含的**，必须和同目录下的 `../mini-spring-cloud-project` 一起用。

| 谁 | 提供什么 | 前端侧怎么用上 |
| --- | --- | --- |
| `mini-spring-cloud-project/docker/infra` | MySQL、Nacos、Jenkins、Portainer，并**自动发布配置中心的内容** | 前端的后端地址就存在 Nacos 里；`mini-net` 网络也由它创建 |
| ├ `docker/infra/nacos/config/env/<环境>/mini-frontend.yaml` | 前端在 dev / prod 两个命名空间的配置 | 前端容器启动时读它，渲染 nginx 反代规则 |
| ├ 外部网络 `mini-net` | 跨 compose 的共享网络 | 前端容器加入它，才能用服务名访问 `mini-gateway` |
| └ `mini-gateway`（`9000`） | **前端唯一要连的后端入口**，对外路由 `/api/user/**`、`/api/order/**`（StripPrefix=1） | nginx 把 `/api/**` **原样**转发给它，**不能删前缀** |
| `mini-user-service` / `mini-order-service` | 业务接口 | 只被网关调用，前端不直连（宿主 `18081/18082` 仅用于排查） |
| MySQL（容器 `3306` / 宿主 `13306`） | 数据 | 与前端无关，后端自己用 |

一句话链路：

```text
浏览器 ──→ 前端容器 nginx(127.0.0.1:5300)
             ├── /            → dist/ 里的静态文件（SPA 回落到 index.html）
             └── /api/**      → mini-gateway:9000 ──→ user / order service ──→ MySQL
                                     ↑
              这个地址来自 Nacos 的 mini-frontend.yaml（容器启动时读，不烤进镜像）
```

**为什么后端地址要放到配置中心**：`VITE_API_BASE_URL` 是 Vite 的**构建期常量**，一旦设成绝对地址就会被
烤进 `dist/assets/*.js`，结果是"换一个后端地址就得重新构建前端"。所以部署形态这样做：

- 构建期只固定**相对路径** `/api`（`Dockerfile` 里 `ENV VITE_API_BASE_URL=/api`）；
- 浏览器永远只发 `/api/**`；
- 真实后端地址由托管它的 nginx 在**容器启动时**从 Nacos 读，再据此生成 `/api` 的反代规则。

于是：**改后端地址 = 改配置中心 + 重启容器，不需要重新构建前端**；dev 与 prod 用的也是**同一个镜像**。

### 2. 配置项（Nacos）

| 项 | 值 |
| --- | --- |
| dataId | `mini-frontend.yaml` |
| group | `DEFAULT_GROUP` |
| 命名空间 | 环境名（`dev` / `prod`，命名空间 id 刻意就是环境名） |

```yaml
frontend:
  env-label: dev                             # 回成响应头 X-Frontend-Env，用来确认"读的是哪个环境"
  backend-origin: http://mini-gateway:9000   # nginx 把 /api/** 原样转发到这里
  proxy-timeout: 30                          # 反代超时（秒）
```

源文件在**后端仓库**里，和它自己的 `mini-*.yaml` 一起由 `publish-config.sh` 发布：

```text
mini-spring-cloud-project/docker/infra/nacos/config/env/<环境>/mini-frontend.yaml
```

`docker/infra` 起的时候，一次性容器 `nacos-config-init` 会自动把整套配置发布进对应命名空间，
**通常不用手动跑脚本**。

> 后端**混合模式**（应用跑在宿主 IDE/JVM，只有基础设施在容器）时，`backend-origin` 要改成
> `http://host.docker.internal:9000` —— 容器里的 `mini-gateway` 这个服务名那时不存在。
> 改完重启前端容器即可，**不用重新构建镜像**（这正是把地址放配置中心的价值）。

### 3. 部署步骤（三步，顺序不能换）

```bash
# ① cloud 项目：基础设施（MySQL + Nacos + Jenkins + Portainer），并自动发布 mini-frontend.yaml
cd ../mini-spring-cloud-project/docker/infra
cp .env.example .env      # 首次：把 WORKSPACE_DIR 改成仓库根目录绝对路径（pwd 获取）
docker compose up -d
cd ../..

# ② cloud 项目：三个应用（网关 / 用户 / 订单）
APP_ENV=dev IMAGE_TAG=local docker compose -f docker/app/docker-compose.yml up -d
docker compose -f docker/app/docker-compose.yml ps      # 三个都应显示 healthy

# ③ 本项目：前端容器（IMAGE_TAG 必须显式传，否则被 compose 的 :? 守卫拦下）
cd ../mini-vue3-project/docker
IMAGE_TAG=$(git -C .. rev-parse --short HEAD) docker compose --env-file env/dev.env up -d --build
```

> 顺序不能换：前端容器**取不到 Nacos 配置就拒绝启动**（刻意不兜底，避免"页面能开、接口全 404"更难查的现象），
> 而 `mini-frontend.yaml` 与 `mini-net` 网络都由 ① 创建。

### 4. 验证

```bash
docker ps --filter name=mini-frontend          # Up (healthy)，127.0.0.1:5300->80/tcp
docker logs mini-frontend 2>&1 | grep nacos-config
# [nacos-config] ✅ backend-origin=http://mini-gateway:9000  env-label=dev  proxy-timeout=30s

curl -I http://127.0.0.1:5300/
# HTTP/1.1 200 OK
# X-Frontend-Env: dev                             ← 读的是哪个环境的配置
# X-Backend-Origin: http://mini-gateway:9000      ← 这个值来自 Nacos

curl -I http://127.0.0.1:5300/user                # SPA 回落：200（磁盘上没有这个文件）
curl "http://127.0.0.1:5300/api/user/page?pageNum=1&pageSize=1"
# {"code":0,...}      ← 浏览器 → nginx → 网关 → 用户服务 → MySQL
```

浏览器打开 `http://127.0.0.1:5300/`：首页显示「后端已连通」，用户管理页列出库里的数据。实测截图见 §9。

**页脚会显示当前真实链路**（不用去翻配置）：容器化部署时读 nginx 回的 `X-Backend-Origin` /
`X-Frontend-Env` 两个响应头，显示成「反代目标 http://mini-gateway:9000（来自 Nacos）· 环境 dev」；
本机 `npm run dev` 没有这两个头，就显示"经 Vite 代理 /api 转发"。这样"页面连的是哪套后端"一眼可见。

### 5. dev / prod 切换与停止

**同一镜像，只换 `--env-file`**：

```bash
cd docker
IMAGE_TAG=f9eac3a docker compose --env-file env/prod.env up -d   # → 5301，env-label=prod，反代超时 60s
IMAGE_TAG=f9eac3a docker compose --env-file env/dev.env  up -d   # 切回 5300
```

实测：切换前后**镜像 tag 不变**（`mini-frontend:f9eac3a`），只是容器被 recreate，端口 / Nacos 命名空间 /
`env-label` 跟着变。

> ⚠️ **dev 与 prod 不能同时跑**：`docker/docker-compose.yml` 里 `container_name: mini-frontend` 和项目的
> `name: mini-vue3-frontend` 都是固定的，所以 `--env-file env/prod.env up -d` 实际是 **recreate 同一个容器**，
> 而不是并起两个。要真同时跑，去掉固定 `container_name`，或按环境换项目名：
> `docker compose -p mini-frontend-prod --env-file env/prod.env up -d`。

```bash
# 停掉前端容器（基础设施与后端不受影响）
IMAGE_TAG=$(git -C .. rev-parse --short HEAD) docker compose --env-file env/dev.env down
```

### 6. 文件都在哪

**本项目（前端）：**

```text
Dockerfile                                      # 两阶段：node:22-alpine 构建 → nginx:alpine 托管
.dockerignore                                   # 排除 node_modules/dist（否则宿主目录会盖掉容器里的依赖）
docker/docker-compose.yml                       # 前端容器；引用外部网络 mini-net
docker/env/dev.env / prod.env                   # 环境名 + 宿主端口（换环境只换这个文件）
docker/nginx/templates/default.conf.template    # nginx 模板，三个 ${...} 由启动脚本填
docker/nginx/docker-entrypoint.d/10-nacos-config.sh   # 启动时读 Nacos → 渲染 nginx 配置
```

**配套的 mini-spring-cloud-project（后端）：**（下方路径均相对 `../mini-spring-cloud-project`）

```text
docker/infra/docker-compose.yml                 # MySQL + Nacos + Jenkins + Portainer（创建 mini-net 网络）
docker/infra/nacos/config/env/<环境>/mini-frontend.yaml   # 前端的后端地址就发布在这里
docker/infra/nacos/publish-config.sh            # 把上面这套配置发布进 Nacos（infra 起来时自动跑）
docker/app/docker-compose.yml                   # 网关 + 用户服务 + 订单服务（加入 mini-net）
docker/app/env/<环境>.env                       # 后端的 APP_ENV / IMAGE_TAG 等
```

两个 compose 之间**没有 `depends_on`**（跨文件表达不了），靠 `mini-net` 这个 external 网络 + 前端容器
启动时的 60 秒 Nacos 重试来兜顺序。

### 7. 三个真踩过的坑（脚本注释里都写了）

- **`envsubst` 是独立进程，只认环境变量**：脚本里 `FOO=$(...)` 之后必须显式 `export FOO`，
  否则模板里的 `${FOO}` 会被替换成空串，nginx 启动直接报
  `invalid number of arguments in "proxy_pass"`。
- **`/api` 前缀不能删**：网关对外路由本身就是 `/api/user/**`，去前缀由网关自己的 StripPrefix 负责；
  nginx 再删一次就是 404。本机 `npm run dev` 的代理现在**默认保留**前缀
  （`BACKEND_KEEP_API_PREFIX` 默认 `true`）；设成 `false` 才会删，那是给"直连某个服务"用的。
- **`IMAGE_TAG` 必须显式传**：compose 里用了 `${IMAGE_TAG:?…}` 守卫，漏传会直接失败
  （`required variable IMAGE_TAG is missing a value`）。`--env-file env/dev.env` 只提供 `APP_ENV` 和端口，
  **不提供 tag** —— 因为 compose 的 `${...}` 插值只认 shell 环境变量与 `--env-file`，不认 `services.env_file`。

还有一个**在 Nacos 控制台手工建配置时**的坑：控制台的 Monaco 编辑器对自动化逐行输入
会触发 YAML 自动缩进，缩进会一行行越缩越深（内容就非法了）。人工**粘贴**没问题；
或者直接跑发布脚本（推荐，内容与仓库一致且幂等）。

### 8. Jenkins 流水线

Jenkins 里现在有四个任务，前端两个与后端**同构**：

| 任务 | 环境 | 做什么 |
| --- | --- | --- |
| `mini-vue3-frontend-dev` | dev（任务名推导） | 构建镜像 → 产物自检 →（勾 `DEPLOY`）重建本地容器并冒烟 |
| `mini-vue3-frontend-prod` | prod | 三道闸门 → 人工审批 → 把同一镜像晋级为 `:prod`（本阶段不部署） |

环境**不是参数**：任务名决定（`JOB_NAME.endsWith('-prod')`）——参数能被改写，任务名不能。
环境差异也不在流水线里，而在 `docker/env/<环境>.env` + Nacos 命名空间，所以 dev 与 prod
产出的是同一个镜像，prod 只是把 dev 验过的产物晋级。

prod 三道闸门：

1. 工作区必须干净，且**不能站在 main/master 分支**（前端改动走独立分支）；
2. 产物必须"环境无关"：Dockerfile 固定相对基址、产物里出现 `/api` 常量、不出现绝对 api 基址、
   `baseURL` 不是绝对地址 —— 挡住"把后端地址烤进 bundle"这种最危险的失误；
3. 人工审批之后才打 `:prod` 指针。

> 前端**没有单测**（`package.json` 只有 dev/build/preview），所以流水线不造一个假的测试阶段：
> 构建交给 Dockerfile 一次做完，流水线只做镜像构建 + 产物校验 + 部署冒烟。
> 以后要加单测，在 Dockerfile 里加一步即可，流水线结构不用动。

流水线定义是本仓库根目录的 `Jenkinsfile`，由后端仓库的 JCasC
（`docker/infra/jenkins/casc/jenkins.yaml`）在 Jenkins 进程内读入并内联成 job ——
改 Jenkinsfile 后需要重新应用 JCasC（重启 jenkins 容器）才生效。

**操作上的一个坑**：声明式流水线的 `parameters` 要**先跑过一次构建**才会注册到任务上，
所以新建任务后第一次只能点「立即构建」（按默认参数跑），之后才会出现「Build with Parameters」。

#### 部署源与分支规矩（这条最容易误解）

这个环境里 **Jenkins 不拉代码**：任务用 `cps { script(...) }` 内联流水线定义，流水线里**没有任何
`checkout`**；workspace 由 `customWorkspace "${env.FRONTEND_DIR}"` 直接指向**宿主上这个仓库目录**
（同路径挂进容器）。所以"部署源"就是**这个目录此刻的样子**：

- ✅ 改完**不用 push**，直接在 `mini-vue3-frontend-dev` 勾 `DEPLOY` 就能部署（本地联调最快）；
- ⚠️ **连未提交的改动也会被打进镜像** —— 日志的「环境检查」会明说「工作区: 有未提交改动」；
- 流水线里的分支/提交是**只读**取出来的，只用于两件事：算镜像 tag（提交短 SHA）、判 prod 闸门①。

所以**分支规矩是工程规矩，不是 Jenkins 的要求**：

| 规矩 | 为什么 |
| --- | --- |
| 每次改动**新建分支**（`git switch -c feature/xxx`）再提交 | 让"这个镜像对应哪次改动"可追溯、可回滚；也才能在 prod 闸门①上过"不在 main/master" |
| dev 任务**不强制**提交 | dev 允许脏工作区，快速试错；构建的就是工作区 |
| prod 任务**强制**干净 + 非主干 | 闸门①：流水线构建的是工作区而不是某个提交，未提交的改动无法追溯 |
| **分支名不影响"构建什么"** | 构建的永远是工作区。分支名只进 tag 与闸门判据 |

**一次完整闭环（本次实测）**：改首页标题 → 新建分支 `feature/home-title-latest-code`（`c3a4b13`）并提交
→ `mini-vue3-frontend-dev` 勾 `DEPLOY` 构建（22 秒 SUCCESS，镜像 `mini-frontend:c3a4b13`）
→ 容器被换成新镜像 → 刷新 5300，标题已变。

| 改前（容器跑 `98e5edf`） | 改后（容器跑 `c3a4b13`） |
| --- | --- |
| ![改前](verify/deploy/25-before-new-code.png) | ![改后](verify/deploy/28-after-new-code.png) |

> ⚠️ 别忘了勾 `DEPLOY`（默认 `false`）：不勾只构建镜像 + 自检，**容器还是旧的**，页面不会变。
> "部署了却没生效"先查两处：容器 image tag（`docker inspect --format '{{.Config.Image}}' mini-frontend`）
> 和日志里的「镜像 tag」是不是你期望的提交。

> 想改成"固定分支拉最新"（真实 CI 的常态）也完全可以，前提与代价如下：
> Jenkins 容器能访问远端（实测 ✅ 能，容器内有 git 2.47.3 + git 插件；两个仓库都是公开仓库、无需凭据），
> 然后把 `cps{script}` 换成 `cpsScm{ scm{ git{ remote{url(...)}; branch('*/docker-deploy') } }; scriptPath('Jenkinsfile') }`。
> 两点代价：① 流水线定义跟着分支走，改 Jenkinsfile **必须 push 才生效**；② **远端目前只有 `main`**
> （还停在最初那次提交），本地 `docker-deploy` 与各 feature 分支都没推送 —— 直接切 SCM 会部署回旧版本。
> 后端那条流水线不能照搬：它用 docker agent + `-v` 挂 workspace/m2，要求宿主 docker 能按宿主路径看到
> workspace，而 SCM 的 workspace 在容器内的 `jenkins-home` 卷里（宿主看不见）。

### 9. 本次部署与界面走查的证据（`verify/deploy/`）

| Nacos 控制台（dev 命名空间） | 配置内容（启动脚本就从这里取值） |
| --- | --- |
| ![控制台](verify/deploy/01-nacos-console.png) | ![配置](verify/deploy/04-nacos-config-fixed.png) |

| 首页（自带后端连通性自检） | 用户列表 |
| --- | --- |
| ![首页](verify/deploy/06-backend-selfcheck.png) | ![列表](verify/deploy/07-user-list.png) |

| 条件查询 | 新增表单 | 编辑回填 |
| --- | --- | --- |
| ![查询](verify/deploy/08-search-alice.png) | ![新增](verify/deploy/10-create-filled.png) | ![编辑](verify/deploy/13-edit-form.png) |

| 删除二次确认 | Jenkins 前端任务 | 参数化构建 |
| --- | --- | --- |
| ![删除](verify/deploy/15-delete-confirm.png) | ![任务](verify/deploy/17-jenkins-frontend-job.png) | ![参数](verify/deploy/19-jenkins-params-checked.png) |

| prod 闸门①拦下脏工作区 | prod 停在人工审批 | 审批后晋级 `:prod` |
| --- | --- | --- |
| ![闸门一](verify/deploy/22-jenkins-prod-gate1.png) | ![审批](verify/deploy/23-jenkins-prod-approval.png) | ![晋级](verify/deploy/24-jenkins-prod-approved.png) |

容器化部署后的前端（dev 容器 `mini-frontend`，数据是浏览器 → nginx → 网关 → 用户服务 → 容器 MySQL）：

| 用户管理页（5300，`X-Frontend-Env: dev`） |
| --- |
| ![容器化部署](verify/deploy/29-container-dev-user-list.png) |

页脚显示的就是**当前真实链路**（值从 nginx 的 `X-Backend-Origin` / `X-Frontend-Env` 采集）：

| 页脚：反代目标 http://mini-gateway:9000（来自 Nacos）· 环境 dev |
| --- |
| ![页脚](verify/deploy/31-container-footer-nacos-origin.png) |