import useMainStore from '@/store/modules/main'

/**
 * 轻提示 hook：把「组件里怎么弹提示」这件事收口到一个地方。
 * 组件里不用 import store，也不用关心提示停留多久。
 */
export default function useToast() {
  const mainStore = useMainStore()

  return {
    info: (text, duration) => mainStore.showToast(text, 'info', duration),
    success: (text, duration) => mainStore.showToast(text, 'success', duration),
    // 错误留久一点，方便看清后端返回的 message
    error: (text, duration = 4000) => mainStore.showToast(text, 'error', duration)
  }
}