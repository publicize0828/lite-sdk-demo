<template>
  <div class="render-canvas" id="sdk-container">
    <!-- 未初始化 -->
    <div v-if="!initialized && !initializing" class="placeholder">
      <span class="sketch-label">[ 渲染区域 ]</span>
      <span class="hint">// 16:9 canvas // 请先完成初始化</span>
    </div>

    <!-- 初始化中 -->
    <div v-if="initializing" class="loading-overlay">
      <div class="loading-content">
        <span class="sketch-label">> 正在初始化...</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
        </div>
        <span class="hint">{{ downloadProgress }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  initialized: boolean
  initializing: boolean
  downloadProgress: number
}>()
</script>
