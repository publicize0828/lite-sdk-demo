<template>
  <div class="faq-panel">
    <div v-for="(item, idx) in faqs" :key="idx" class="faq-card">
      <!-- 问题 -->
      <div class="faq-q">
        <span class="faq-badge">Q</span>
        <span class="faq-text">{{ item.question }}</span>
      </div>

      <!-- 效果 + 递进测试 -->
      <div v-if="item.effect" class="faq-effect">
        <span class="faq-badge effect">效果</span>
        <div class="faq-text">
          <p>{{ item.effect }}</p>
          <!-- 自动测试：一键跑完四步，每步间隔 3s -->
          <div class="test-steps">
            <button
              class="test-step auto-run"
              :disabled="testing"
              @click="testFullFlow()"
            >
              {{ testing ? `正在测试... (${currentStep}/4)` : '▶ 开始测试' }}
            </button>
            <span class="test-arrow">→</span>
            <button class="test-step" :class="{ active: currentStep === 1 }" :disabled="testing" @click="sdk?.offline()">① 离线</button>
            <span class="test-arrow">→</span>
            <button class="test-step" :class="{ active: currentStep === 2 }" :disabled="testing" @click="sdk?.executeSsml('<speak>这是离线缓冲的测试消息</speak>')">② 发文本</button>
            <span class="test-arrow">→</span>
            <button class="test-step" :class="{ active: currentStep === 3 }" :disabled="testing" @click="sdk?.online()">③ 在线</button>
            <span class="test-arrow">→</span>
            <button class="test-step" :class="{ active: currentStep === 4 }" :disabled="testing" @click="sdk?.flushSpeakQueue()">④ 播放</button>
          </div>
        </div>
      </div>

      <!-- 方案说明 -->
      <div v-if="item.solution" class="faq-solution">
        <span class="faq-badge solution">方案</span>
        <div class="faq-text" v-html="item.solution" />
      </div>

      <!-- 代码（CodeMirror 只读） -->
      <div v-if="item.code" class="faq-code">
        <div class="faq-code-bar">
          <span class="faq-code-lang">TypeScript</span>
          <button class="faq-copy-btn" @click="copyCode(item.code, idx)">{{ copiedIdx === idx ? '已复制 ✓' : '复制代码' }}</button>
        </div>
        <div :ref="(el) => setCodeRef(el as HTMLElement, idx)" class="faq-code-view" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onUnmounted, nextTick } from 'vue'
import type { EditorView } from '@codemirror/view'
import { createCodeView } from '../composables/useCodeMirror'
import { SdkKey } from '../types'

const sdk = inject(SdkKey)!

interface FaqItem {
  question: string
  effect?: string
  solution?: string
  code?: string
}

const copiedIdx = ref(-1)

// 自动测试状态
const testing = ref(false)
const currentStep = ref(0)

function copyCode(code: string, idx: number) {
  navigator.clipboard.writeText(code)
  copiedIdx.value = idx
  setTimeout(() => { copiedIdx.value = -1 }, 2000)
}


// CodeMirror 实例管理
const codeViews: EditorView[] = []
function setCodeRef(el: HTMLElement | null, idx: number) {
  if (!el || codeViews[idx]) return
  const item = faqs[idx]
  if (!item.code) return
  nextTick(() => {
    codeViews[idx] = createCodeView(el, item.code!, 'js', true)
  })
}

onUnmounted(() => codeViews.forEach(v => v?.destroy()))

// 自动测试：依次执行 ①离线 → ②发文本 → ③在线 → ④播放，每步间隔 3s
async function testFullFlow() {
  if (!sdk || testing.value) return
  testing.value = true
  currentStep.value = 0
  try {
    // ① 离线
    currentStep.value = 1
    sdk.offline()
    await new Promise(r => setTimeout(r, 3000))

    // ② 发文本
    currentStep.value = 2
    sdk.executeSsml('<speak>这是离线缓冲的测试消息</speak>')
    await new Promise(r => setTimeout(r, 3000))

    // ③ 在线
    currentStep.value = 3
    sdk.online()
    // 等 SDK 状态回调确认在线，再等 3s 让音频通道就绪
    await sdk.waitForOnline(10000)
    await new Promise(r => setTimeout(r, 1000))

    // ④ 播放
    currentStep.value = 4
    sdk.flushSpeakQueue()
    await new Promise(r => setTimeout(r, 3000))
  } finally {
    testing.value = false
    currentStep.value = 0
  }
}

const faqs: FaqItem[] = [
  {
    question: '数字人离线切回在线后，接着发送文字驱动，数字人不播报。',
    effect: '离线状态下发送的文字被缓冲到队列中，恢复在线后自动按序播报。日志面板可看到 "[缓冲] SDK 未就绪，消息已缓冲（队列 1 条）" → "[缓冲] 恢复播放缓冲消息（共 1 条）"。',
    solution: 'SDK 从离线恢复到在线有一个过渡期，期间 <code>sdk.speak()</code> 不会立即生效。<br><br>'
      + '在 <code>executeSsml</code> 里检查在线状态，未就绪时把 SSML 推入缓冲队列（<b>不丢弃</b>），'
      + '在 <code>onStatusChange</code> 回调中检测 <code>status=0</code>（在线）时自动 <code>flushSpeakQueue()</code>。',
    code: `// ==== 缓冲队列 ====
const _pendingSpeak: string[] = []
let _isOnline = true

// speak 时检查状态：未就绪则缓冲
function executeSsml(ssml: string) {
  if (!sdk || !isInitialized || !_isOnline) {
    _pendingSpeak.push(ssml)
    addLog('缓冲', \`SDK 未就绪，消息已缓冲（队列 \${_pendingSpeak.length} 条）\`)
    return
  }
  sdk.speak(ssml, true, true)
}

// SDK 状态变化：恢复在线时 flush 队列
onStatusChange(status: number) {
  if (status === 0) {          // 0 = 在线
    _isOnline = true
    flushSpeakQueue()
  } else {
    _isOnline = false
  }
}

// 逐个播放缓冲消息
function flushSpeakQueue() {
  if (_pendingSpeak.length === 0) return
  addLog('缓冲', \`恢复播放缓冲消息（共 \${_pendingSpeak.length} 条）\`)
  while (_pendingSpeak.length > 0) {
    executeSsml(_pendingSpeak.shift()!)
  }
}

// 销毁时清空队列
function destroy() {
  _pendingSpeak.length = 0
  _isOnline = true
  sdk.offlineMode()
  sdk.destroy()
}`,
  },
]
</script>

<style scoped>
.faq-panel { padding: 12px; overflow-y: auto; height: 100%; }
.faq-card {
  background: var(--card-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--border, rgba(255,255,255,0.06));
  border-radius: 10px; padding: 16px; margin-bottom: 12px;
}
.faq-q, .faq-effect, .faq-solution {
  display: flex; gap: 10px; margin-bottom: 14px; align-items: flex-start;
}
.faq-text { font-size: 13px; color: var(--text, rgba(255,255,255,0.85)); line-height: 1.7; flex: 1; }
.faq-text p { margin: 0 0 8px; }
.faq-badge {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.faq-badge { background: #2563eb; color: #fff; }
.faq-badge.effect { background: #10b981; color: #fff; width: auto; padding: 0 8px; }
.faq-badge.solution { background: #f59e0b; color: #000; width: auto; padding: 0 8px; }

/* 递进式测试步骤 */
.test-steps { display: flex; align-items: center; gap: 6px; margin: 10px 0; }
.test-step {
  padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;
  background: #374151; color: #d1d5db; border: none; cursor: pointer;
  transition: all .15s;
}
.test-step:hover { background: #4b5563; color: #fff; }
.test-step:active { background: #10b981; color: #fff; }
.test-step:disabled { opacity: 0.4; cursor: not-allowed; }
.test-step.auto-run {
  background: #10b981; color: #fff; font-weight: 600;
  min-width: 130px;
}
.test-step.auto-run:hover { background: #059669; }
.test-step.auto-run:disabled { background: #374151; color: #6b7280; opacity: 1; }
.test-step.active { background: #f59e0b; color: #000; font-weight: 600; }
.test-arrow { font-size: 12px; color: #6b7280; }

/* 代码块 */
.faq-code { border-radius: 8px; overflow: hidden; }
.faq-code-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px; background: #16162a; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.faq-code-lang { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500; }
.faq-copy-btn {
  padding: 3px 10px; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px;
  background: transparent; color: rgba(255,255,255,0.5); font-size: 11px;
  cursor: pointer; transition: all .15s;
}
.faq-copy-btn:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.9); }
.faq-code-view { min-height: 120px; max-height: 400px; overflow: auto; }
</style>
