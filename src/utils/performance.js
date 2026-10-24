/**
 * 性能小工具。
 * 说明：这里手写一个 throttle，是为了不为了一个函数引入 underscore（文章里用的是 underscore）。
 * 语义和 underscore 的 throttle 一致：首次立即执行，wait 内的后续调用在尾部补一次。
 */
export function throttle(fn, wait = 200) {
  let last = 0
  let timer = null

  return function throttled(...args) {
    const now = Date.now()
    const remaining = wait - (now - last)

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn.apply(this, args)
      return
    }

    if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }
}