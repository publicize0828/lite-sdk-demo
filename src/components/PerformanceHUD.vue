<template>
  <div class="perf-hud">
    <div class="hud-row">
      <span class="hud-label">帧率</span>
      <span class="hud-value">{{ perf.fps.toFixed(0) }}<span class="hud-unit">fps</span></span>
    </div>
    <div class="hud-row">
      <span class="hud-label">驱动响应</span>
      <span class="hud-value">{{ perf.driveResponseTime > 0 ? perf.driveResponseTime.toFixed(0) : '--' }}<span class="hud-unit">ms</span></span>
    </div>
    <div class="hud-row">
      <span class="hud-label">打断时延</span>
      <span class="hud-value">{{ perf.interruptLatency >= 0 ? perf.interruptLatency.toFixed(0) : '--' }}<span class="hud-unit">ms</span></span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  perf: { fps: number; driveResponseTime: number; interruptLatency: number }
}>()
</script>

<style scoped>
.perf-hud {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  pointer-events: none;
  user-select: none;
}
.hud-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.hud-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}
.hud-value {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Courier New', monospace;
  text-align: right;
  min-width: 50px;
}
.hud-unit {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
  font-weight: 400;
}
</style>
