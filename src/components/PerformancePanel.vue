<template>
  <div class="perf-panel">
    <div class="metrics">
      <div class="metric">
        <span class="metric-label">帧率</span>
        <span class="metric-value">{{ perf.fps.toFixed(1) }}<span class="unit">fps</span></span>
      </div>
      <div class="metric">
        <span class="metric-label">首帧渲染</span>
        <span class="metric-value">{{ perf.renderDuration > 0 ? perf.renderDuration.toFixed(0) : '--' }}<span class="unit">ms</span></span>
      </div>
      <div class="metric">
        <span class="metric-label">驱动响应</span>
        <span class="metric-value">{{ perf.driveResponseTime > 0 ? perf.driveResponseTime.toFixed(0) : '--' }}<span class="unit">ms</span></span>
      </div>
      <div class="metric">
        <span class="metric-label">打断时延</span>
        <span class="metric-value">{{ perf.interruptLatency.toFixed(1) }}<span class="unit">ms</span></span>
      </div>
      <div class="metric">
        <span class="metric-label">网络延迟</span>
        <span class="metric-value">{{ perf.networkRtt.toFixed(1) }}<span class="unit">ms</span></span>
      </div>
      <div class="metric">
        <span class="metric-label">下载速率</span>
        <span class="metric-value">{{ perf.networkDownlink.toFixed(1) }}<span class="unit">MB/s</span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  perf: {
    fps: number
    driveResponseTime: number
    renderDuration: number
    networkRtt: number
    networkDownlink: number
    interruptLatency: number
  }
}>()
</script>

<style scoped>
.perf-panel { padding: 8px 0; }
.metrics { display: flex; gap: 6px; flex-wrap: wrap; }
.metric {
  flex: 1; min-width: 80px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 6px;
  text-align: center;
}
.metric-label { font-size: 9px; color: var(--text-muted); display: block; }
.metric-value { font-size: 16px; font-weight: 700; }
.unit { font-size: 10px; color: var(--text-muted); margin-left: 2px; font-weight: 400; }
.metric-status { font-size: 13px; color: var(--success); }
</style>
