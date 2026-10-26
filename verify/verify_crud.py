"""阶段 A：真实后端上的增删改查 / 查询 / 校验 / 404 验证（数据集：2 条）。

⚠️ 数据前提：下面的断言绑定在**最初那 2 条活跃行的数据集**上——
   "共 2 条 / 1 页"、"3 行"、`status=11` 显示为"未知"、按 "String" 模糊查询命中 1 行、按状态=禁用命中 1 行。
   换成别的数据集（例如 mini-spring-cloud-project 的容器 MySQL 里的 alice/bob/charlie）时，
   失败只会出现在这些**断言**上，属于测试夹具不匹配，不是产品缺陷。
   要让它可移植，得让脚本先用接口自备这几条夹具数据（目前没做）。
"""

import sys
import time

from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5300"
SHOTS = "verify/screenshots"
# 登录名在库里是唯一索引（含已软删除的行），所以每次跑都用新名字，避免命中唯一键冲突
SUFFIX = str(int(time.time()))
USERNAME = f"e2e_{SUFFIX}"
PASSWORD = "secret123"
NICKNAME = f"端到端校验用户{SUFFIX}"
NICKNAME_EDITED = f"端到端校验用户{SUFFIX}-已改"

failures, console_errors = [], []


def check(label, condition, detail=""):
    print(f"[{'PASS' if condition else 'FAIL'}] {label} {detail}")
    if not condition:
        failures.append(label)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1360, "height": 900})
    page.on("pageerror", lambda err: console_errors.append(f"pageerror: {err}"))
    page.on(
        "console",
        lambda msg: console_errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None,
    )

    # ---------- 1. 首页自检 ----------
    page.goto(f"{BASE}/#/home")
    page.wait_for_load_state("networkidle")
    health = page.locator(".health__text")
    check("首页自检：后端已连通", "已连通" in health.inner_text(), f"-> {health.inner_text()}")
    check("首页自检：显示请求前缀", "/api" in page.locator(".health__meta").inner_text())
    check("首页：接口清单 6 行", page.locator(".card").last.locator("tbody tr").count() == 6)
    page.screenshot(path=f"{SHOTS}/01-home.png", full_page=True)

    # ---------- 2. 列表首屏 ----------
    page.get_by_role("link", name="用户管理", exact=True).click()
    page.wait_for_selector(".user-list")
    page.wait_for_selector("tbody tr")
    page.wait_for_timeout(300)

    rows = page.locator("tbody tr")
    check("列表渲染 2 行", rows.count() == 2, f"-> {rows.count()}")
    check("状态标签渲染", page.locator(".status-tag").count() == 2)
    check("后端异常 status=11 显示为未知", "未知" in page.locator("tbody tr").first.inner_text())
    check("分页总数文案", page.locator(".pagination__total").inner_text() == "共 2 条 / 1 页")
    check("第 1 页时上一页禁用", page.get_by_role("button", name="上一页").is_disabled())
    check("单页时下一页禁用", page.get_by_role("button", name="下一页").is_disabled())
    page.screenshot(path=f"{SHOTS}/02-user-list.png", full_page=True)

    # ---------- 3. 条件查询 ----------
    page.locator('.search-bar input[type="text"]').first.fill("String")
    page.get_by_role("button", name="查询").click()
    page.wait_for_timeout(700)
    check("登录名模糊查询 -> 1 行", page.locator("tbody tr").count() == 1, f"-> {page.locator('tbody tr').count()}")

    page.get_by_role("button", name="重置").click()
    page.wait_for_timeout(700)
    check("重置后恢复 2 行", page.locator("tbody tr").count() == 2, f"-> {page.locator('tbody tr').count()}")

    page.locator(".search-bar select").select_option("0")
    page.get_by_role("button", name="查询").click()
    page.wait_for_timeout(700)
    check("按状态=禁用查询 -> 1 行", page.locator("tbody tr").count() == 1, f"-> {page.locator('tbody tr').count()}")
    page.screenshot(path=f"{SHOTS}/03-search.png", full_page=True)

    page.get_by_role("button", name="重置").click()
    page.wait_for_timeout(700)

    # ---------- 4. 前端校验 ----------
    page.get_by_role("button", name="新增用户").click()
    page.wait_for_selector(".dialog__panel")
    dialog = page.locator(".dialog__panel")
    dialog.get_by_role("button", name="确定").click()
    page.wait_for_timeout(250)
    check("空表单被拦下（登录名）", "登录名不能为空" in dialog.inner_text())
    check("空表单被拦下（密码）", "密码不能为空" in dialog.inner_text())
    check("校验失败时弹窗不关闭", page.locator(".dialog__panel").count() == 1)
    dialog.locator('input[type="text"]').nth(0).fill("ab")  # 太短，应被规则拦下
    dialog.locator('input[type="password"]').fill("123")
    dialog.get_by_role("button", name="确定").click()
    page.wait_for_timeout(250)
    check("登录名格式校验", "3-20 位字母、数字或下划线" in dialog.inner_text())
    check("密码长度校验", "密码至少 6 位" in dialog.inner_text())
    page.screenshot(path=f"{SHOTS}/04-validation.png")

    # ---------- 5. 新增 ----------
    dialog.locator('input[type="text"]').nth(0).fill(USERNAME)
    dialog.locator('input[type="password"]').fill(PASSWORD)
    dialog.locator('input[type="text"]').nth(1).fill(NICKNAME)
    dialog.get_by_role("button", name="确定").click()
    expect(page.locator(".toast", has_text="新增成功").first).to_be_visible(timeout=5000)
    expect(page.locator(".dialog__panel")).to_have_count(0, timeout=3000)
    page.wait_for_selector(f"tbody tr:has-text('{USERNAME}')", timeout=5000)
    check("新增成功提示 + 弹窗关闭", True)
    check("新增用户出现在列表（3 行）", page.locator("tbody tr").count() == 3, f"-> {page.locator('tbody tr').count()}")
    check("新增用户状态为启用", "启用" in page.locator(f"tbody tr:has-text('{USERNAME}')").inner_text())
    check("分页总数已刷新", page.locator(".pagination__total").inner_text() == "共 3 条 / 1 页")
    page.screenshot(path=f"{SHOTS}/05-created.png", full_page=True)

    # ---------- 6. 编辑（密码留空 + 详情回填） ----------
    page.locator(f"tbody tr:has-text('{USERNAME}')").get_by_role("button", name="编辑").click()
    page.wait_for_selector(".dialog__panel")
    dialog = page.locator(".dialog__panel")
    page.wait_for_timeout(600)  # 等 GET /user/{id} 回来
    check("编辑弹窗回填登录名", dialog.locator('input[type="text"]').nth(0).input_value() == USERNAME)
    check("编辑弹窗回填昵称", dialog.locator('input[type="text"]').nth(1).input_value() == NICKNAME)
    check("编辑弹窗不回填密码（WRITE_ONLY 字段）", dialog.locator('input[type="password"]').input_value() == "")
    dialog.locator('input[type="text"]').nth(1).fill(NICKNAME_EDITED)
    dialog.get_by_role("button", name="确定").click()
    expect(page.locator(".toast", has_text="修改成功").first).to_be_visible(timeout=5000)
    page.wait_for_selector(f"tbody tr:has-text('{NICKNAME_EDITED}')", timeout=5000)
    check("昵称已更新且列表已刷新", page.locator(f"tbody tr:has-text('{NICKNAME_EDITED}')").count() == 1)
    page.screenshot(path=f"{SHOTS}/06-edited.png", full_page=True)

    # ---------- 7. 删除（软删除 + 二次确认） ----------
    expect(page.locator(".dialog__panel")).to_have_count(0, timeout=3000)  # 等编辑弹窗完全退场
    page.locator(f"tbody tr:has-text('{USERNAME}')").get_by_role("button", name="删除").click()
    page.wait_for_selector('.dialog__panel:has-text("删除确认")')
    confirm = page.locator('.dialog__panel:has-text("删除确认")')
    check("删除有二次确认且说明是软删除", "软删除" in confirm.inner_text())
    check("确认弹窗里显示的是该用户昵称", NICKNAME_EDITED in confirm.inner_text(), f"-> {confirm.inner_text()!r}")
    page.screenshot(path=f"{SHOTS}/07-delete-confirm.png")
    confirm.get_by_role("button", name="确认删除").click()
    expect(page.locator(".toast", has_text="删除成功").first).to_be_visible(timeout=5000)
    page.wait_for_timeout(900)
    check("删除后列表不再出现该用户", page.locator(f"tbody tr:has-text('{USERNAME}')").count() == 0)
    check("列表恢复 2 行", page.locator("tbody tr").count() == 2, f"-> {page.locator('tbody tr').count()}")
    page.screenshot(path=f"{SHOTS}/08-deleted.png", full_page=True)

    # ---------- 8. 404 ----------
    page.goto(f"{BASE}/#/not-exist")
    page.wait_for_load_state("networkidle")
    check("404 页面渲染", "404" in page.locator(".not-found__code").inner_text())
    page.screenshot(path=f"{SHOTS}/09-not-found.png")

    browser.close()

print("\n--- 控制台错误 ---")
print("\n".join(console_errors[:10]) if console_errors else "(无)")
print("\n--- 结论 ---")
if failures:
    print(f"{len(failures)} 项失败: {failures}")
    sys.exit(1)
print("阶段 A 全部通过")