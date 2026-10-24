<script setup>
import LoadingBar from '@/components/LoadingBar.vue'
import ToastMessage from '@/components/ToastMessage.vue'

/**
 * 根组件：只放全局性的东西（进度条、轻提示），页面内容交给布局里的 RouterView。
 */
</script>

<template>
  <LoadingBar />
  <RouterView />
  <ToastMessage />
</template>