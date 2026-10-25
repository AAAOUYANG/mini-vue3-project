#!/bin/sh
# ============================================================================
# 容器启动时从 Nacos 取前端配置，渲染出 nginx 的反代配置。
#
# 为什么是这个顺序：官方 nginx 镜像的 /docker-entrypoint.sh 会按文件名顺序执行
# /docker-entrypoint.d/*.sh，10- 先于官方的 20-envsubst-on-templates.sh 和 30-，
# 所以这里写好的 /etc/nginx/conf.d/default.conf 一定在 nginx 启动前就位。
#
# 为什么不把变量交给官方的 20-envsubst-on-templates.sh 去渲染：那个脚本与这里分属两次
# 执行、而且在子 shell 里跑（官方 entrypoint 用 `find | while read` 管道），
# 这里 export 的变量传不过去。所以取值和渲染都在本脚本内一次做完。
#
# 但注意：envsubst 是**独立进程**，只认环境变量。下面取到值后必须显式 export，
# 光赋值（FOO=$(...)）envsubst 看不到，会把 ${FOO} 替换成空串——
# 症状是 nginx 报 `invalid number of arguments in "proxy_pass"`。
# ============================================================================
set -eu

: "${NACOS_ADDR:?必须提供 NACOS_ADDR（容器里通常是 nacos:8848）}"
: "${NACOS_NAMESPACE:?必须提供 NACOS_NAMESPACE（dev 或 prod）}"
DATA_ID="${NACOS_FRONTEND_DATA_ID:-mini-frontend.yaml}"
GROUP="${NACOS_GROUP:-DEFAULT_GROUP}"

log() { echo "[nacos-config] $*"; }

log "读取 ${NACOS_ADDR}  namespace=${NACOS_NAMESPACE}  dataId=${DATA_ID}  group=${GROUP}"

# 逐秒重试：前端容器与后端容器分属两个 compose，跨文件 depends_on 管不到顺序，
# Nacos 可能还没起来。60 秒足够覆盖「后端刚启动」这种情况。
CONTENT=""
i=1
while [ "$i" -le 60 ]; do
  CONTENT=$(curl -fsS -m 5 \
    "http://${NACOS_ADDR}/nacos/v1/cs/configs?dataId=${DATA_ID}&group=${GROUP}&tenant=${NACOS_NAMESPACE}" \
    2>/dev/null || true)
  [ -n "$CONTENT" ] && break
  [ "$i" -eq 1 ] && log "暂时取不到，最多重试 60 次（每秒一次）..."
  i=$((i + 1))
  sleep 1
done

if [ -z "$CONTENT" ]; then
  {
    echo "[nacos-config] ❌ 60 秒内没取到配置，容器不启动。"
    echo "               这里刻意**不给兜底默认值**：后端地址要是猜一个，"
    echo "               只会得到「页面能打开、接口全 404」这种更难定位的现象。"
    echo "               请依次确认："
    echo "                 ① 配置已发布（$DATA_ID 在 $NACOS_NAMESPACE 命名空间里）"
    echo "                 ② NACOS_NAMESPACE 与发布时用的环境名一致"
    echo "                 ③ 容器能连上 ${NACOS_ADDR}"
  } >&2
  exit 1
fi

# 只提取用到的单个标量。刻意不做完整 YAML 解析：nginx 镜像里没有 yq/python，
# 为三个 key 装一套解析器不值当。解析结果全部打印出来，取错了一眼能看见。
extract() {
  printf '%s\n' "$CONTENT" \
    | sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" \
    | head -n 1 \
    | sed 's/[[:space:]]*#.*$//' \
    | tr -d '"' \
    | sed 's/[[:space:]]*$//'
}

BACKEND_ORIGIN=$(extract 'backend-origin')
FRONTEND_ENV_LABEL=$(extract 'env-label')
FRONTEND_PROXY_TIMEOUT=$(extract 'proxy-timeout')

if [ -z "$BACKEND_ORIGIN" ]; then
  echo "[nacos-config] ❌ 配置里没有 frontend.backend-origin，原始内容如下：" >&2
  printf '%s\n' "$CONTENT" >&2
  exit 1
fi
[ -n "$FRONTEND_PROXY_TIMEOUT" ] || FRONTEND_PROXY_TIMEOUT=30
[ -n "$FRONTEND_ENV_LABEL" ] || FRONTEND_ENV_LABEL=unknown

# envsubst 是独立进程，只认**环境变量**：这三行赋值是 shell 变量，不 export 它看不到，
# 会把模板里的 ${...} 统统替换成空串（nginx 随后报 proxy_pass 参数个数不对）。
export BACKEND_ORIGIN FRONTEND_ENV_LABEL FRONTEND_PROXY_TIMEOUT

# envsubst 显式限定变量名：否则 nginx 的 $uri / $proxy_host 等会被当成环境变量替换成空串
envsubst '${BACKEND_ORIGIN} ${FRONTEND_ENV_LABEL} ${FRONTEND_PROXY_TIMEOUT}' \
  < /etc/nginx/frontend/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# 渲染结果先自检：万一 envsubst 又什么都没替换，在这里就失败，不要留给 nginx 去报难懂的错。
# 注意只查这三个占位符——模板注释里本身就有 "${...}" 这类字样，用宽泛的 \$\{ 会误报。
if grep -qE '\$\{(BACKEND_ORIGIN|FRONTEND_ENV_LABEL|FRONTEND_PROXY_TIMEOUT)\}' /etc/nginx/conf.d/default.conf; then
  echo "[nacos-config] ❌ 渲染后仍残留占位符，生成结果如下：" >&2
  cat /etc/nginx/conf.d/default.conf >&2
  exit 1
fi
if ! grep -q "proxy_pass ${BACKEND_ORIGIN};" /etc/nginx/conf.d/default.conf; then
  echo "[nacos-config] ❌ 渲染后的 proxy_pass 不是期望的地址：${BACKEND_ORIGIN}" >&2
  grep -n 'proxy_pass' /etc/nginx/conf.d/default.conf >&2
  exit 1
fi

log "✅ backend-origin=${BACKEND_ORIGIN}  env-label=${FRONTEND_ENV_LABEL}  proxy-timeout=${FRONTEND_PROXY_TIMEOUT}s"
log "已生成 /etc/nginx/conf.d/default.conf，接下来交给 nginx 启动"