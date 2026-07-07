<template>
  <div class="panel">
    <div class="log-header">
      <h3 class="panel-title">/ LOG /</h3>
      <div class="log-tools">
        <button class="btn-sm" @click="copyLogs">复制</button>
        <button class="btn-sm" :class="{ active: debuggerOn }" @click="toggleDebugger">调试面板</button>
      </div>
    </div>
    <div class="log-list" ref="logContainer">
      <div v-for="entry in logs" :key="entry.id" class="log-entry">
        <span class="log-time">[{{ entry.time }}]</span>
        <span class="log-type">{{ entry.type }}</span>
        <span class="log-msg">{{ entry.message }}</span>
      </div>
      <div v-if="logs.length === 0" class="log-empty">// waiting for events...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { LogEntry } from '../types'
import { useAutoScroll } from '../composables/useAutoScroll'

const props = defineProps<{
  logs: LogEntry[]
}>()

const { container: logContainer } = useAutoScroll(() => props.logs)

const debuggerOn = ref(false)
function copyLogs() {
  const text = props.logs.map(e => `[${e.time}] ${e.type} | ${e.message}`).join('\n')
  navigator.clipboard.writeText(text)
}
function toggleDebugger() {
  debuggerOn.value = !debuggerOn.value
  const sdk = (window as any).__xmovSdk
  sdk?.showDebugInfo?.()
}
</script>

<style scoped>
.log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.log-header .panel-title { margin-bottom: 0; }
.log-tools { display: flex; gap: 4px; }
</style>
