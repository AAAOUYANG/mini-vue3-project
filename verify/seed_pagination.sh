#!/usr/bin/env bash
# 为 verify_pagination.py 准备/清理数据：灌入 9 条 e2e_seed_* 用户，使总数达到 11 条 = 2 页。
#
#   ./verify/seed_pagination.sh seed     # 灌数据
#   ./verify/seed_pagination.sh clean    # 物理清理所有 e2e_* 测试数据
#
# 注意：后端必须已经启动。默认目标是 **mini-spring-cloud-project 的网关**（http://localhost:9000），
# 路径带 /api 前缀（/api/user/**，去前缀由网关的 StripPrefix 做）。
# 清理用的是 MySQL 直连（默认容器 MySQL：宿主 13306），因为 delete 接口是软删除，
# 测试数据会一直占着 username 的唯一索引。
set -euo pipefail

API=${API:-http://localhost:9000}
# 数据库连接从环境变量取，默认值对应 mini-spring-cloud-project 的容器 MySQL（宿主 13306）。
# 若后端是单体/本机 MySQL，用 DB_HOST=127.0.0.1 DB_PORT=3306 覆盖。
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-13306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-root}
DB_NAME=${DB_NAME:-mini_spring_boot}
MYSQL="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD $DB_NAME"

case "${1:-}" in
  seed)
    for i in 01 02 03 04 05 06 07 08 09; do
      curl -s -X POST "$API/api/user/save" \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"e2e_seed_$i\",\"password\":\"secret123\",\"nickname\":\"分页校验$i\",\"status\":1}" \
        -o /dev/null -w "seed_$i:%{http_code} "
    done
    echo
    $MYSQL -e "select count(*) as active from sys_user where deleted = 0;"
    ;;
  clean)
    $MYSQL -e "delete from sys_user where username like 'e2e\\_%'; select id, username, deleted from sys_user;"
    ;;
  *)
    echo "用法: $0 {seed|clean}" >&2
    exit 1
    ;;
esac