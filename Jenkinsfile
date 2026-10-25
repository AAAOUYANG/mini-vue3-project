#!/usr/bin/env groovy
// ============================================================================
// mini-vue3-project 本地 CI 流水线（dev / prod 共用这一份）
//
// 做四件事：构建镜像（镜像内完成 npm ci + vite build）→ 产物自检
//          →（dev）用刚打出来的镜像重建本地前端容器并冒烟
//          →（prod）人工审批后把同一批镜像晋级为 :prod 发布指针
//
// 与后端 mini-spring-boot-project/Jenkinsfile 刻意保持同构：同样的 agent/workspace 写法、
// 同样的「环境从任务名推导」、同样把环境差异放在任务名 + env 文件 + Nacos 命名空间里，
// 而不是放进流水线。两份流水线都在 Jenkins 里（mini-spring-cloud-* / mini-vue3-frontend-*）。
//
// 环境怎么区分：
//   任务名就是环境：mini-vue3-frontend-dev / mini-vue3-frontend-prod，两个任务内联同一份
//   本文件。环境从 JOB_NAME 推导，**刻意不做成参数**——参数能被改写，任务名不能。
//   命名不符合约定时一律落到 dev，不会因为改名而误发生产。
//
// 三道生产闸门（都硬编码在本文件里，不靠人自觉）：
//   ① 工作区必须干净，且当前分支不能是主干（main/master）
//   ② 产物必须是「环境无关」的：构建期基址固定成相对路径 /api。
//      前端最危险的失误是把后端地址烤进 bundle（那样换地址就得重新构建前端，
//      也失去了「运维在配置中心改地址」的能力），所以这条必须由流水线挡住。
//      注意：前端的真实后端地址**不在产物里**，而是 nginx 启动时从 Nacos 取，
//      见 docker/nginx/docker-entrypoint.d/10-nacos-config.sh。
//   ③ 人工审批（input）之后才打 :prod 指针
//
// 为什么没有「编译 + 单测」阶段（和后端不同）：
//   本工程没有单测，package.json 里也没有 lint 脚本（scripts 只有 dev/build/preview）。
//   所以流水线不造一个假的测试阶段，而是把「构建」这件事交给 Dockerfile 一次做完
//   （npm ci + vite build 都在镜像内），流水线只做镜像构建 + 产物校验 + 部署冒烟。
//   要加单测时，Dockerfile 里加一步即可，不必改流水线结构。
//
// 三个关键的、容易踩错的设计点（与后端一致）：
//
// 1. 构建的就是「挂载进 Jenkins 的宿主仓库目录」，不是 Jenkins 的 workspace 副本。
//    顶层 agent 用 customWorkspace 把 workspace 直接指向 $FRONTEND_DIR，于是
//    docker build . 的上下文天然就是真实仓库。
//    更关键的是 docker-outside-of-docker：Jenkins 让**宿主 docker** 去构建，构建上下文
//    路径必须与宿主一致，否则报路径不存在。这里 $FRONTEND_DIR 在宿主和容器里是同一个
//    路径（docker/infra compose 刻意这样挂的），所以成立。
//
// 2. 镜像构建与部署阶段直接在 Jenkins 节点上执行 docker 命令。
//    Jenkins 官方镜像里没有 docker CLI，docker/infra/jenkins/Dockerfile 从 docker:cli
//    里把静态链接的 docker / compose / buildx 拷了进来。
//
// 3. 冒烟不去打宿主的 127.0.0.1:5300 —— Jenkins 自己跑在容器里，那是它自己。
//    正确做法有两种，这里都用：docker exec 进前端容器（看它自己的状态），
//    或者用一个临时 curl 容器加入 mini-net 按**服务名**访问（验证网络与反代）。
//
// 代码来源没有 Git 服务：仓库以完全一致的路径挂在 Jenkins 里，job 定义里也不含 SCM，
// 所以流水线绝不会去 checkout 而覆盖工作区（options.skipDefaultCheckout 是防御性保留）。
// ============================================================================

pipeline {
    agent {
        node {
            // label 是 node agent 的必填项（不写会在解析阶段直接报
            // "Missing required parameter for agent type node: label"）；
            // 本环境只有内置节点，标签就是 built-in。
            label 'built-in'
            // FRONTEND_DIR 由 JCasC 的 jenkins.globalNodeProperties 注入。
            customWorkspace "${env.FRONTEND_DIR ?: env.FRONTEND_WORKSPACE_DIR}"
        }
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        // 防御性：本 job 不含 SCM，正常不会有隐式 checkout。
        skipDefaultCheckout(true)
    }

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: '',
               description: '镜像 tag。留空 = 用提交短 SHA（不可变、可晋级）；手工调试 dev 时可填 local')
        booleanParam(name: 'DEPLOY', defaultValue: false,
               description: 'dev：构建后重建本地前端容器并冒烟。prod：忽略（本阶段不部署生产）')
    }

    environment {
        // 环境从**任务名**推导：mini-vue3-frontend-dev -> dev，-prod -> prod。
        APP_ENV = "${env.JOB_NAME.endsWith('-prod') ? 'prod' : 'dev'}"

        DOCKER_SOCK = '/var/run/docker.sock'
        CURL_IMAGE  = 'curlimages/curl:latest'
        NETWORK     = 'mini-net'
        CONTAINER   = 'mini-frontend'
        // 前端容器内部的 nginx 端口（宿主映射端口在 docker/env/<环境>.env 里）
        INNER_PORT  = '80'
    }

    stages {

        stage('环境检查') {
            steps {
                script {
                    sh '''
                        set -eu
                        echo "环境          : $APP_ENV"
                        echo "仓库目录      : $FRONTEND_DIR"
                        [ -n "${FRONTEND_DIR:-}" ] || { echo "❌ FRONTEND_DIR 为空：应由 JCasC 全局环境变量注入"; exit 1; }
                        [ -f "$FRONTEND_DIR/package.json" ] || { echo "❌ $FRONTEND_DIR 下找不到 package.json"; exit 1; }
                        [ -f "$FRONTEND_DIR/Dockerfile" ] || { echo "❌ 找不到 Dockerfile"; exit 1; }
                        [ -f "$FRONTEND_DIR/docker/docker-compose.yml" ] || { echo "❌ 找不到 docker/docker-compose.yml"; exit 1; }
                        [ -f "$FRONTEND_DIR/docker/env/$APP_ENV.env" ] || { echo "❌ 找不到 docker/env/$APP_ENV.env"; exit 1; }
                        [ -S "$DOCKER_SOCK" ] || { echo "❌ 找不到 docker socket $DOCKER_SOCK"; exit 1; }

                        BRANCH=$(git -C "$FRONTEND_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 未知)
                        echo "当前分支      : $BRANCH"
                        echo "当前提交      : $(git -C "$FRONTEND_DIR" rev-parse --short HEAD 2>/dev/null || echo 未知)"
                        DIRTY=0
                        if [ -n "$(git -C "$FRONTEND_DIR" status --porcelain 2>/dev/null)" ]; then DIRTY=1; fi

                        command -v docker >/dev/null 2>&1 \
                            || { echo "❌ 节点上没有 docker CLI（见 docker/infra/jenkins/Dockerfile）"; exit 1; }
                        echo "Docker 客户端 : $(docker --version)"
                        echo "Docker 服务端 : $(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo '❌ 连不上 docker.sock')"
                        echo "Compose       : $(docker compose version --short 2>/dev/null || echo 无)"

                        echo ""
                        if [ "$APP_ENV" = "prod" ]; then
                            # ---- 生产闸门 ①：来源必须干净，且不能站在主干分支上 ----
                            if [ "$DIRTY" -eq 1 ]; then
                                echo "❌ 生产闸门①：工作区有未提交改动，拒绝构建生产版本"
                                echo "   流水线构建的是工作区而不是某个提交，未提交的改动无法追溯。"
                                git -C "$FRONTEND_DIR" status --short | head -10
                                exit 1
                            fi
                            case "$BRANCH" in
                                main|master)
                                    echo "❌ 生产闸门①：当前在主干分支 $BRANCH 上，不允许直接晋级生产"
                                    echo "   前端改动请走独立分支（如 docker-deploy / release-*），再触发本任务。"
                                    exit 1 ;;
                            esac
                            echo "✅ 生产闸门①：工作区干净，且不在主干分支（$BRANCH）"
                            echo "⏳ 生产闸门②：产物环境无关性，在「产物自检」阶段检查"
                            echo "⏳ 生产闸门③：人工审批（在「生产闸门与晋级」阶段，审批前不会动任何东西）"
                            echo "   注意：本阶段不部署生产，只产出可发布的镜像指针。"
                        else
                            if [ "$DIRTY" -eq 1 ]; then
                                echo "工作区        : 有未提交改动 —— 流水线构建的就是这份工作区，不是某个提交"
                            else
                                echo "工作区        : 干净"
                            fi
                            echo "环境性质      : dev（允许未提交改动；干净工作区/主干分支/审批只对 prod 任务生效）"
                        fi
                    '''

                    // 镜像 tag：默认用提交短 SHA（不可变，便于「同一制品晋级」），可用参数覆盖
                    def shortSha = sh(script: "git -C '${env.FRONTEND_DIR}' rev-parse --short HEAD",
                                      returnStdout: true).trim()
                    def tag = params.IMAGE_TAG?.trim() ? params.IMAGE_TAG.trim() : shortSha
                    env.RESOLVED_IMAGE_TAG = tag
                    echo "镜像 tag      : ${tag}${params.IMAGE_TAG?.trim() ? '' : '（默认取自提交短 SHA）'}"
                }
            }
        }

        stage('构建镜像') {
            // npm ci + vite build 都在镜像内完成（见 Dockerfile），流水线不重复构建一遍。
            // 因此本阶段之后，dist 只存在于镜像里，不再落回仓库工作区
            // —— 刻意不往工作区写文件，否则会把真仓库弄脏（prod 闸门①就会失败）。
            steps {
                script {
                    echo "构建镜像 mini-frontend:${env.RESOLVED_IMAGE_TAG}"
                    sh "docker build -t mini-frontend:${env.RESOLVED_IMAGE_TAG} ."
                    sh "docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -E '^mini-frontend:' | sort"
                }
            }
        }

        stage('产物自检') {
            // prod 闸门②。dev 也照样检查，早点发现问题。
            steps {
                script {
                    sh '''
                        set -eu
                        TAG="$RESOLVED_IMAGE_TAG"

                        echo "① 构建期基址必须是相对路径 /api（源码级判据，无歧义）"
                        grep -qE '^ENV[[:space:]]+VITE_API_BASE_URL=/api' Dockerfile \
                            || { echo "❌ Dockerfile 里没有 ENV VITE_API_BASE_URL=/api"; exit 1; }
                        echo "   ✅ Dockerfile: $(grep -E '^ENV[[:space:]]+VITE_API_BASE_URL' Dockerfile)"

                        echo "② 产物里应当出现相对路径常量 \\"/api\\"（正向证据：构建确实用了它）"
                        docker run --rm --entrypoint sh "mini-frontend:$TAG" -c \
                            "grep -rlo '\\"/api\\"' /usr/share/nginx/html/assets | head -3" \
                            | grep -q . || { echo "❌ 产物里找不到相对路径常量 \\"/api\\""; exit 1; }
                        echo "   ✅ 命中"

                        echo "③ 产物里不应当把绝对地址当成 api 基址（http://某主机/api）"
                        hits=$(docker run --rm --entrypoint sh "mini-frontend:$TAG" -c \
                            "grep -rEo 'https?://[^\\" ]+/api' /usr/share/nginx/html/assets | head -5" || true)
                        if [ -n "$hits" ]; then
                            echo "❌ 产物里出现了绝对 api 基址，说明后端地址被烤进了 bundle："
                            echo "$hits"
                            echo "   这样换后端地址就得重新构建前端，也失去了在配置中心改地址的能力。"
                            exit 1
                        fi
                        echo "   ✅ 无命中"

                        echo "④ axios 的 baseURL 不应是绝对地址"
                        hits=$(docker run --rm --entrypoint sh "mini-frontend:$TAG" -c \
                            "grep -rEo 'baseURL:\\"https?:[^\\"]*' /usr/share/nginx/html/assets | head -5" || true)
                        [ -z "$hits" ] || { echo "❌ baseURL 被写成了绝对地址：$hits"; exit 1; }
                        echo "   ✅ 无命中"

                        echo ""
                        echo "✅ 产物自检通过：前端产物是环境无关的（真实后端地址由 nginx 启动时从 Nacos 取）"
                    '''
                }
            }
        }

        // dev 本地部署 + 冒烟。prod 不走这里（本阶段不做生产部署）。
        stage('部署与冒烟') {
            when {
                expression { return env.APP_ENV == 'dev' && params.DEPLOY }
            }
            steps {
                script {
                    sh '''
                        set -eu
                        echo "重建前端容器（IMAGE_TAG=$RESOLVED_IMAGE_TAG，环境文件 docker/env/$APP_ENV.env）"
                        # --env-file 必须带：compose 的 ${...} 插值只认 shell 环境变量和 --env-file，
                        # 不认 services.env_file。端口与 Nacos 命名空间都由这个文件决定。
                        IMAGE_TAG="$RESOLVED_IMAGE_TAG" \
                            docker compose -f docker/docker-compose.yml --env-file "docker/env/$APP_ENV.env" up -d

                        echo "等待容器健康（最多 120 秒）..."
                        healthy=0
                        for i in $(seq 1 24); do
                            st=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo none)
                            if [ "$st" = "healthy" ]; then healthy=1; break; fi
                            sleep 5
                        done
                        if [ "$healthy" -ne 1 ]; then
                            echo "❌ 容器 120 秒内未健康（当前状态：${st:-未知}）"
                            docker logs --tail 40 "$CONTAINER" 2>&1 || true
                            exit 1
                        fi
                        echo "✅ 容器健康"
                        docker logs "$CONTAINER" 2>&1 | grep -E '\\[nacos-config\\]' || true

                        echo ""
                        echo "冒烟①：按服务名访问（模拟真实流量路径：外部 → nginx）"
                        docker run --rm --network "$NETWORK" "$CURL_IMAGE" -sI \
                            "http://$CONTAINER:$INNER_PORT/" > /tmp/front-headers.txt
                        cat /tmp/front-headers.txt | head -5
                        grep -qi "^HTTP/.* 200" /tmp/front-headers.txt \
                            || { echo "❌ 首页不是 200"; exit 1; }

                        echo "冒烟②：环境校验 —— 反代地址必须等于配置中心里那一份的值"
                        # 同一镜像在 dev/prod 下读不同命名空间的同名 dataId，这一步能直接发现接错环境。
                        expected=$(docker run --rm --network "$NETWORK" "$CURL_IMAGE" -s \
                            "http://nacos:8848/nacos/v1/cs/configs?dataId=mini-frontend.yaml&group=DEFAULT_GROUP&tenant=$APP_ENV" \
                            | sed -n 's/^[[:space:]]*backend-origin:[[:space:]]*//p' | head -1 | tr -d '\\r')
                        if [ -z "$expected" ]; then
                            echo "❌ 没从 Nacos($APP_ENV 命名空间) 取到 mini-frontend.yaml 的 backend-origin"
                            exit 1
                        fi
                        grep -qi "^X-Frontend-Env: $APP_ENV" /tmp/front-headers.txt \
                            || { echo "❌ 响应头 X-Frontend-Env 不是 $APP_ENV（接错环境？）"; exit 1; }
                        grep -qi "^X-Backend-Origin: $expected" /tmp/front-headers.txt \
                            || { echo "❌ 响应头 X-Backend-Origin 与配置中心不一致（期望 $expected）"; exit 1; }
                        echo "✅ 环境校验：X-Frontend-Env=$APP_ENV，X-Backend-Origin=$expected（与 Nacos 一致）"

                        echo ""
                        echo "冒烟③：前端容器 → 网关 → 用户服务（保留 /api 前缀，经 nginx 反代）"
                        body=$(docker run --rm --network "$NETWORK" "$CURL_IMAGE" -s \
                            "http://$CONTAINER:$INNER_PORT/api/user/page?pageNum=1&pageSize=1")
                        echo "响应：$(echo "$body" | head -c 200)"
                        case "$body" in
                            *'"code":0'*) echo "✅ 冒烟通过（业务码 code=0）" ;;
                            *) echo "❌ 冒烟失败：期望 code=0"; \
                               echo "   若为 502，请确认后端 dev 环境已启动：APP_ENV=dev IMAGE_TAG=<tag> docker compose -f ../mini-spring-boot-project/docker/app/docker-compose.yml up -d"; \
                               exit 1 ;;
                        esac
                    '''
                }
            }
        }

        // prod 的闸门③与晋级。审批通过前不动任何东西；本阶段不做生产部署。
        stage('生产闸门与晋级') {
            when {
                expression { return env.APP_ENV == 'prod' }
            }
            steps {
                // 本环境无鉴权，submitter 留空 = 任何能触发任务的人都可以点。
                // 真实环境应写 submitter: 'release-managers' 限定审批人。
                input message: "prod：即将把镜像 ${env.RESOLVED_IMAGE_TAG} 晋级为 :prod。确认继续？", ok: '确认晋级'
                script {
                    sh "docker tag mini-frontend:${env.RESOLVED_IMAGE_TAG} mini-frontend:prod"
                    sh "docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^mini-frontend:' | sort"
                    echo "已晋级：mini-frontend → :prod（指向 ${env.RESOLVED_IMAGE_TAG}）"
                    echo "本阶段不做生产部署（未接目标环境）。真要发布时："
                    echo "  docker compose -f docker/docker-compose.yml --env-file docker/env/prod.env up -d"
                }
            }
        }
    }

    post {
        always {
            // 产物（dist）只存在于镜像里，不落回工作区，所以这里不归档文件；
            // 镜像本身就是交付物：mini-frontend:<tag>。
            echo "镜像：mini-frontend:${env.RESOLVED_IMAGE_TAG ?: '(未解析)'}"
        }
        success {
            script {
                if (env.APP_ENV == 'prod') {
                    echo "✅ 流水线成功：生产版本 ${env.RESOLVED_IMAGE_TAG} 已晋级为 :prod（未部署）"
                } else {
                    echo "✅ 流水线成功：mini-frontend → 镜像 tag ${env.RESOLVED_IMAGE_TAG}"
                }
            }
        }
        failure {
            echo "❌ 流水线失败，控制台日志见上方"
        }
    }
}