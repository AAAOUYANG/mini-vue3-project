"""阶段 B：分页（翻页 / 每页条数）与"滚动到底部加载更多"追加模式验证。

运行前先灌数据、跑完再清理：

    ./verify/seed_pagination.sh seed
    python3 verify/verify_pagination.py
    ./verify/seed_pagination.sh clean

灌入 9 条 e2e_seed_* 后总数 11 条 = 2 页（第 1 页 10 行，第 2 页 1 行）。

⚠️ 数据前提：这个 11 = **基线 2 条** + 9 条种子，所以脚本里写死的 11 / 10 / 1 只在基线为 2 条时成立。
   基线不是 2 条（例如 mini-spring-cloud-project 的容器 MySQL 里是 3 条 → 12 条 / 第 2 页 2 行）时，
   失败会出现在这些**断言**上，属于测试夹具不匹配，不是产品缺陷。自备数据后可移植，目前没做。
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5300"
SHOTS = "verify/screenshots"
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

    # ---------- 1. 翻页模式 ----------
    page.goto(f"{BASE}/#/user")
    page.wait_for_selector(".user-list")
    page.wait_for_selector("tbody tr")
    page.wait_for_timeout(500)

    rows = page.locator("tbody tr")
    check("总数 11 条 / 2 页", page.locator(".pagination__total").inner_text() == "共 11 条 / 2 页")
    check("第 1 页渲染 10 行", rows.count() == 10, f"-> {rows.count()}")
    check("当前页高亮为 1", page.locator(".pagination__item--active").inner_text() == "1")
    check("第 1 页上一页禁用", page.get_by_role("button", name="上一页").is_disabled())
    check("第 1 页下一页可用", not page.get_by_role("button", name="下一页").is_disabled())
    page.screenshot(path=f"{SHOTS}/10-page-1.png", full_page=True)

    page.locator(".pagination__pages").get_by_role("button", name="2", exact=True).click()
    page.wait_for_timeout(800)
    check("跳到第 2 页渲染 1 行", rows.count() == 1, f"-> {rows.count()}")
    check("当前页高亮为 2", page.locator(".pagination__item--active").inner_text() == "2")
    check("最后一页下一页禁用", page.get_by_role("button", name="下一页").is_disabled())
    page.screenshot(path=f"{SHOTS}/11-page-2.png", full_page=True)

    page.get_by_role("button", name="上一页").click()
    page.wait_for_timeout(800)
    check("上一页回到 10 行", rows.count() == 10, f"-> {rows.count()}")

    # 跳页输入框
    page.locator(".pagination__jump-input").fill("2")
    page.locator(".pagination__jump-input").press("Enter")
    page.wait_for_timeout(800)
    check("跳页输入框生效", page.locator(".pagination__item--active").inner_text() == "2")

    # 每页条数
    page.locator(".pagination__size select").select_option("20")
    page.wait_for_timeout(800)
    check("每页 20 条时只剩 1 页", page.locator(".pagination__total").inner_text() == "共 11 条 / 1 页")
    check("每页 20 条渲染 11 行", rows.count() == 11, f"-> {rows.count()}")
    page.locator(".pagination__size select").select_option("10")
    page.wait_for_timeout(800)

    # ---------- 2. 追加模式（滚动加载更多） ----------
    page.locator(".user-list__auto-load input").check()
    page.wait_for_timeout(900)
    check("切到追加模式后回到第 1 页的 10 行", rows.count() == 10, f"-> {rows.count()}")
    check("追加模式隐藏页码分页器", page.locator(".pagination__pages").count() == 0)
    check("追加模式显示已加载进度", "已加载 10 / 11 条" in page.locator(".user-list__load-more").inner_text())
    page.screenshot(path=f"{SHOTS}/12-append-before.png", full_page=True)

    scroller = page.locator(".user-list__scroller")
    scroller.evaluate("el => el.scrollTop = el.scrollHeight")
    page.wait_for_timeout(1400)
    check("滚动到底部自动追加到 11 行", rows.count() == 11, f"-> {rows.count()}")
    ids = [rows.nth(i).locator("td").first.inner_text() for i in range(rows.count())]
    check("追加后没有重复行", len(set(ids)) == len(ids), f"-> {len(set(ids))}/{len(ids)}")
    check("数据加载完显示到底提示", "已经到底了" in page.locator(".user-list__load-more").inner_text())
    page.screenshot(path=f"{SHOTS}/13-append-after.png", full_page=True)

    # ---------- 3. 切回翻页模式 ----------
    page.locator(".user-list__auto-load input").uncheck()
    page.wait_for_timeout(900)
    check("切回翻页模式重新显示分页器", page.locator(".pagination__pages").count() == 1)
    check("切回翻页模式只有第 1 页的 10 行", rows.count() == 10, f"-> {rows.count()}")

    browser.close()

print("\n--- 控制台错误 ---")
print("\n".join(console_errors[:10]) if console_errors else "(无)")
print("\n--- 结论 ---")
if failures:
    print(f"{len(failures)} 项失败: {failures}")
    sys.exit(1)
print("阶段 B 全部通过")