# ============================================================================
# 多阶段构建：node 里构建静态文件 → nginx 托管 + 反代 /api
#
# 关键设计：**后端地址不进这个镜像**。
#   vite 的 VITE_API_BASE_URL 是构建期常量，这里固定成相对路径 /api（与环境无关）；
#   真实的 backend-origin 由 nginx **启动时**从 Nacos 取，再渲染出 /api 的反代规则。
#   → 同一个镜像在 dev / prod 之间直接切换，改后端地址不需要重新构建前端。
# ============================================================================

FROM node:22-alpine AS build
WORKDIR /app

# 先只拷依赖清单：依赖没变时这一层命中缓存，改业务代码不会重新 npm ci
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# .dockerignore 里排掉了 node_modules / dist / .git：
# 否则宿主的 node_modules 会覆盖镜像里 npm ci 装好的那份，跨平台二进制对不上会直接构建失败。
COPY . .

# 只在构建期需要；浏览器永远发相对路径 /api，所以它就等于 /api
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM nginx:alpine

# 模板刻意放在**非** /etc/nginx/templates 目录：
# 官方镜像的 20-envsubst-on-templates.sh 会拿「进程里当时已有的环境变量」渲染那个目录，
# 而我们的变量是启动时从 Nacos 取的、在那个脚本执行时还不存在，会被替换成空串，
# 反过来覆盖掉正确配置。所以由我们自己的 10-nacos-config.sh 显式渲染。
COPY docker/nginx/templates/ /etc/nginx/frontend/templates/
COPY docker/nginx/docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/*.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80