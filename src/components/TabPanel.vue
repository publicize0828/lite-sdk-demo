<template>
  <div class="tab-panel">
    <div class="tab-bar">
      <button v-if="showAi" class="tab-btn" :class="{ active: activeTab === 'ai' }" @click="activeTab = 'ai'">AI助手</button>
      <button v-if="showDev" class="tab-btn" :class="{ active: activeTab === 'playground' }" @click="activeTab = 'playground'">演练场</button>
      <button class="tab-btn" :class="{ active: activeTab === 'tutorial' }" @click="activeTab = 'tutorial'">教学</button>
      <button class="tab-btn" :class="{ active: activeTab === 'op' }" @click="activeTab = 'op'">操作</button>
      <button class="tab-btn" :class="{ active: activeTab === 'code' }" @click="activeTab = 'code'">API调用日志</button>
      <button class="tab-btn" :class="{ active: activeTab === 'perf' }" @click="activeTab = 'perf'">性能</button>
      <button class="tab-btn" :class="{ active: activeTab === 'faq' }" @click="activeTab = 'faq'">FAQ</button>
      <button class="tab-btn" :class="{ active: activeTab === 'log' }" @click="activeTab = 'log'">日志</button>
    </div>
    <div v-if="showAi" class="tab-content" v-show="activeTab === 'ai'"><AiAssistant /></div>
    <div class="tab-content" v-show="activeTab === 'tutorial'"><TutorialPanel /></div>
    <div v-if="showDev" class="tab-content" v-show="activeTab === 'playground'"><PlaygroundPanel :credentials="credentials" /></div>
    <div class="tab-content" v-show="activeTab === 'op'"><OperationPanel :credentials="credentials" /></div>
    <div class="tab-content" v-show="activeTab === 'code'"><CodePanel :code-snippets="codeSnippets" /></div>
    <div class="tab-content" v-show="activeTab === 'perf'"><PerformancePanel :perf="perf" /></div>
    <div class="tab-content" v-show="activeTab === 'faq'"><FaqPanel /></div>
    <div class="tab-content" v-show="activeTab === 'log'"><LogPanel :logs="logs" /></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LogPanel from './LogPanel.vue'
import CodePanel from './CodePanel.vue'
import TutorialPanel from './TutorialPanel.vue'
import AiAssistant from './AiAssistant.vue'
import OperationPanel from './OperationPanel.vue'
import PerformancePanel from './PerformancePanel.vue'
import PlaygroundPanel from './PlaygroundPanel.vue'
import FaqPanel from './FaqPanel.vue'
import type { LogEntry } from '../types'
import type { CodeSnippetEntry } from '../composables/useSDK'

const props = defineProps<{
  logs: LogEntry[]
  codeSnippets: CodeSnippetEntry[]
  perf: { fps: number; driveResponseTime: number; renderDuration: number; networkRtt: number; networkDownlink: number; interruptLatency: number }
  credentials: { appId: string; appSecret: string; gatewayServer: string }
}>()

const isProd = import.meta.env.PROD
const showDev = ref(true)
const showAi = ref(true)
const activeTab = ref('ai')

// 三连击屏幕 → 切换 AI助手 显隐
let _clickCount = 0
let _clickTimer = 0
function onTripleClick() {
  _clickCount++
  if (_clickCount === 1) {
    _clickTimer = window.setTimeout(() => { _clickCount = 0 }, 800)
  } else if (_clickCount >= 3) {
    clearTimeout(_clickTimer)
    _clickCount = 0
    showAi.value = !showAi.value
    if (showAi.value) activeTab.value = 'ai'
  }
}
onMounted(() => document.addEventListener('click', onTripleClick))
onUnmounted(() => { document.removeEventListener('click', onTripleClick); clearTimeout(_clickTimer) })
</script>
