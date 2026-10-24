import { onMounted, onUnmounted, ref, unref } from 'vue'

import { throttle } from '@/utils/performance'

/**
 * 滚动监听 hook（对应文章里的 scroll_Listener）。
 *
 * 用法：
 *   const { isBottom, scrollTop } = useScrollListener(containerRef)   // 监听元素
 *   const { isBottom, scrollTop } = useScrollListener()               // 不传则监听 window
 *   在调用方 watch(isBottom, ...) 做"滚到底部加载更多"。
 *
 * 相比文章里的初版，这里补了三个坑：
 *  1. 容差 1px：高 DPI 屏上 scrollTop 是小数（例如 2297.60009765625），
 *     scrollTop + clientHeight >= scrollHeight 会永远差一点点，永远不成立；
 *  2. isBottom 会回落成 false：否则滚回顶部后再滚到底部也不会再次触发（watch 不到变化）；
 *  3. 事件用 passive: true，滚动不被监听逻辑阻塞。
 *
 * 使用方式（重要）：调用方要 watch 的是 isBottom 的"变化"，所以数据变化后必须调一次
 * recompute()，否则会出现"首次到底部不触发"的坑：
 * 列表刚挂载时还没数据、容器撑不满，此时 isBottom 已经是 true；
 * 数据回来把容器撑高后并不会自动重算（没有滚动事件），于是 isBottom 一直是 true，
 * 用户再滚到底部时"没有变化"，watch 就不会执行。
 *
 *   const { isBottom, recompute } = useScrollListener(scrollerRef)
 *   watch(isBottom, onBottom)
 *   watch(() => list.length, async () => { await nextTick(); recompute() })
 */
export default function useScrollListener(element) {
  // 默认监听 window
  let el = window

  const isBottom = ref(false)
  const scrollTop = ref(0)
  const scrollHeight = ref(0)
  const clientHeight = ref(0)

  /** 立即重算一次（数据变化后由调用方手动调） */
  const recompute = () => {
    const isWindow = el === window
    const scroller = isWindow ? document.documentElement : el

    clientHeight.value = isWindow ? document.documentElement.clientHeight : el.clientHeight
    scrollTop.value = scroller.scrollTop
    scrollHeight.value = scroller.scrollHeight

    isBottom.value = scrollTop.value + clientHeight.value >= scrollHeight.value - 1
  }

  const scrollEventListener = throttle(recompute, 200)

  // 组件挂载到 DOM 后再加监听
  onMounted(() => {
    if (element) el = unref(element) || window
    el.addEventListener('scroll', scrollEventListener, { passive: true })
    recompute()
  })

  // 离开页面时移除监听，避免别的页面滚动时这个页面也在响应
  onUnmounted(() => {
    el.removeEventListener('scroll', scrollEventListener)
  })

  // 返回响应式数据对象，在调用方用 watch 监听
  return { isBottom, scrollTop, scrollHeight, clientHeight, recompute }
}