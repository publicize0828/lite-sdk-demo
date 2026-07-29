<template>
  <div
    class="demo-bar"
    :class="{ dimmed: barDimmed }"
    :style="{ left: barX + 'px', bottom: barY + 'px' }"
    @pointerdown="onDragDown"
    @pointermove="onDragMove"
    @pointerup="onDragUp"
  >
    <div class="demo-drag">⠿</div>
    <div class="demo-inner">
    <!-- 快捷模板 -->
    <div class="demo-templates">
      <div class="demo-row demo-row--state">
        <span class="demo-row-label">状态</span>
        <div class="demo-row-btns">
          <button class="demo-tpl-btn demo-state-btn" :class="{ active: currentState === 'idle' }"" @click="setState('idle')">待机</button>
          <button class="demo-tpl-btn demo-state-btn" :class="{ active: currentState === 'listen' }"" @click="setState('listen')">倾听</button>
          <button class="demo-tpl-btn demo-state-btn" :class="{ active: currentState === 'speak' }"" @click="setState('speak')">播报</button>
          <span class="demo-sep"></span>
          <button v-if="screenMode" class="demo-tpl-btn" :class="{ active: poweredOff }"" @click="togglePower">{{ poweredOff ? '开机' : '关机' }}</button>
          <button class="demo-tpl-btn demo-disconnect-btn"" @click="disconnectRoom">断开房间</button>
        </div>
      </div>
      <div class="demo-row">
        <span class="demo-row-label">关键动作</span>
        <div class="demo-row-btns">
          <button v-for="(item, idx) in kaPresets" :key="'k'+idx" class="demo-tpl-btn" :class="{ active: lastClickedLabel === item.label }" @click="clickExample(item.label, item.ssml)">{{ item.label }}</button>
        </div>
      </div>
      <div class="demo-row">
        <span class="demo-row-label">行走</span>
        <div class="demo-row-btns">
          <button v-for="(item, idx) in walkPresets" :key="'w'+idx" class="demo-tpl-btn" :class="{ active: lastClickedLabel === item.label }" @click="clickExample(item.label, item.ssml)">{{ item.label }}</button>
          <button class="demo-tpl-btn" :class="{ active: lastClickedLabel === '边说边行走' }" :disabled="walkAndSpeakDisabled" @click="clickWalkAndSpeak">边说边行走</button>
        </div>
      </div>
      <div class="demo-row">
        <span class="demo-row-label">停顿注音</span>
        <div class="demo-row-btns">
          <button v-for="(item, idx) in breakPresets" :key="'br'+idx" class="demo-tpl-btn" :class="{ active: lastClickedLabel === item.label }" @click="clickExample(item.label, item.ssml)">{{ item.label }}</button>
        </div>
      </div>
      <div class="demo-row">
        <span class="demo-row-label">自定义事件</span>
        <div class="demo-row-btns">
          <button v-for="(item, idx) in customPresets" :key="'c'+idx" class="demo-tpl-btn" :class="{ active: lastClickedLabel === item.label }" @click="clickExample(item.label, item.ssml)">{{ item.label }}</button>
        </div>
      </div>
    </div>
    <!-- 输入行 -->
    <div class="demo-input-row">
      <span v-if="aiLoading" class="demo-ai-badge">AI 思考中…</span>
      <input
        ref="inputEl"
        v-model="text"
        type="text"
        autocomplete="off"
        readonly
        @focus="($event.target as HTMLInputElement).removeAttribute('readonly')"
        :placeholder="aiLoading ? 'AI 正在生成回复…' : '输入文本回车播报；? 开头走 AI 问答…'"
        class="demo-input"
        :class="{ 'ai-mode': text.startsWith('?') || text.startsWith('@') }"
        :disabled="aiLoading"
        @keyup.enter="speakText"
      />
      <button
        class="demo-send"
        :class="{ 'ai-send': text.startsWith('?') || text.startsWith('@') }"
        :disabled="(!text.trim() && !aiLoading) || aiLoading"
        @click="speakText"
      >{{ aiLoading ? '…' : '发送' }}</button>
      <button class="demo-stop" @click="stop" :disabled="aiLoading">打断</button>
      <button class="demo-fullscreen" @click="toggleFullscreen" title="全屏 (ESC 退出)">⛶</button>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, nextTick, onMounted, onUnmounted } from 'vue'
import { useAiChat } from '../composables/useAiChat'
import { widgetTemplates } from '../config/templates'
import { walkLabels, buildWalkPresets, lastWalkTarget, getWalkStepsTarget, makeWalkSpeakSsml } from '../utils/walk'
import { SdkKey } from '../types'

const _tplMap = Object.fromEntries(widgetTemplates.map(t => [t.name, t.ssml]))

const sdk = inject(SdkKey)!

const { loading: aiLoading, send: aiSend, messages } = useAiChat()

const text = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const lastAiSpoken = ref(-1)
const isCommandMode = ref(false)
const currentState = ref('idle')
const lastClickedLabel = ref('')
const poweredOff = ref(false)
const screenMode = ref(false)
const barDimmed = ref(false)

function checkScreenMode() {
  screenMode.value = !!(window as any).__youlingUi?.isScreenMode
}

function togglePower() {
  const ui = (window as any).__youlingUi
  if (poweredOff.value) {
    ui?.powerOn()
  } else {
    ui?.powerOff()
  }
  poweredOff.value = !poweredOff.value
}

function disconnectRoom() {
  const ui = (window as any).__youlingUi
  if (ui?.disconnect) ui.disconnect()
}

// 拖拽
const barX = ref(Math.max(0, (window.innerWidth - 520) / 2))
const barY = ref(24)
let _dragging = false, _dx = 0, _dy = 0
function onDragDown(e: PointerEvent) {
  const t = e.target as HTMLElement
  if (t.tagName === 'BUTTON' || t.tagName === 'INPUT' || t.closest('button') || t.closest('input')) return
  _dragging = true
  _dx = e.clientX - barX.value
  _dy = (window.innerHeight - e.clientY) - barY.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}
function onDragMove(e: PointerEvent) {
  if (!_dragging) return
  barX.value = Math.min(window.innerWidth - 200, Math.max(0, e.clientX - _dx))
  barY.value = Math.min(window.innerHeight - 60, Math.max(0, (window.innerHeight - e.clientY) - _dy))
}
function onDragUp() { _dragging = false }

// 播报状态轮询
function checkSpeakState() {
  barDimmed.value = !!(window as any).__youlingUi?.isSpeaking
  checkScreenMode()
}
let _pollTimer = 0
onMounted(() => { _pollTimer = window.setInterval(checkSpeakState, 300) })
onUnmounted(() => { clearInterval(_pollTimer) })

function setState(state: string) {
  const xSdk = (window as any).__xmovSdk
  const ui = (window as any).__youlingUi
  if (!xSdk) return
  lastClickedLabel.value = ''
  currentState.value = state
  if (state === 'idle') { xSdk.idle(); ui?.logApi('sdk.idle()') }
  else if (state === 'listen') { xSdk.listen(); ui?.logApi('sdk.listen()') }
  else if (state === 'speak') {
    const ssml = '<speak>下面，我将演示数字人的基础交互能力，包括语音合成、口唇同步、面部表情与肢体动作。让我们携手推进信创产品在军事领域的深度应用，为科技强军贡献力量。</speak>'
    xSdk.speak(ssml, true, true)
    ui?.logApi(`sdk.speak(\`${ssml}\`, true, true)`)
  }
}

const kaPresets = [
  { label: '播报+右侧指示(高)', tooltip: '右侧指示(高)：右手高举指向右上方', ssml: '<speak>\n  真的特别感谢大家抽时间来这里。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>RightSide02</action_semantic>\n    </data>\n  </ue4event>\n  顺便大家可以看向右上方。下面，我将演示数字人的基础交互能力，包括语音合成、口唇同步、面部表情与肢体动作。让我们携手推进信创产品在军事领域的深度应用，为科技强军贡献力量。\n</speak>' },
  { label: '播报+提升+抓重点', tooltip: '提升+抓重点：先提升右手，再抓重点手势', ssml: '<speak>\n  在信息安全培训中，我们要牢记几个原则。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>Elevate</action_semantic>\n    </data>\n  </ue4event>\n  首先提升思想认识，克服麻痹心理，时刻保持清醒头脑。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>KeyPoints</action_semantic>\n    </data>\n  </ue4event>\n  其次要抓住重点环节，内网隔离、访问控制、加密传输。\n</speak>' },
  { label: '播报+指屏幕', tooltip: '指向屏幕意图动作', ssml: '<speak>\n  真的特别感谢大家抽时间来这里。\n  <ue4event>\n    <type>ka_intent</type>\n    <data>\n      <ka_intent>Pointscreen</ka_intent>\n    </data>\n  </ue4event>\n  顺便大家可以看向我的手指方向,继续下面的内容。谢谢大家~\n</speak>' },
  { label: '播报+左侧指示+指屏幕', tooltip: '左侧指示(KA)+指屏幕(KA intent)：双动作组合', ssml: '<speak>\n  真的特别感谢大家抽时间来这里。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>LeftSide</action_semantic>\n    </data>\n  </ue4event>\n  大家可以看向左边。下面我将演示数字人的基础交互能力，包括语音合成、口唇同步、面部表情与肢体动作。让我们携手推进信创产品在军事领域的深度应用，为科技强军贡献力量。最后大家可以看向我的手指方向,\n  <ue4event>\n    <type>ka_intent</type>\n    <data>\n      <ka_intent>Pointscreen</ka_intent>\n    </data>\n  </ue4event>\n  继续下面的内容。谢谢大家~\n</speak>' },
]

const walkPresets = ref<{ label: string; ssml: string; tooltip?: string }[]>([])

const defaultLabels = 'FGHIJKLMNOPQRSTU'.split('')

watch(walkLabels, (labels) => {
  const src = labels.length ? labels : defaultLabels
  walkPresets.value = buildWalkPresets(src)
}, { immediate: true })

function extractWalkTarget(ssml: string): string | null {
  const m = ssml.match(/<target>(\w+)<\/target>/)
  return m ? m[1] : null
}

const WALK_STEPS = 3

const walkAndSpeakDisabled = computed(() => {
  const labels = walkLabels.value
  if (!labels.length) return true
  return !getWalkStepsTarget(labels, WALK_STEPS)
})

function clickWalkAndSpeak() {
  const labels = walkLabels.value
  if (!labels.length) return
  const target = getWalkStepsTarget(labels, WALK_STEPS)
  if (!target) return
  const ssml = makeWalkSpeakSsml(target)
  lastWalkTarget.value = target
  lastClickedLabel.value = '边说边行走'
  sdk?.executeSsml(ssml)
}

const breakPresets = [
  { label: '播报+停顿', ssml: '<speak>大家好<break time="500ms"/>真的特别感谢大家抽时间来这里</speak>' },
  { label: '播报+注音', ssml: '<speak>\n  让每一块屏幕、每个应用、每一个终端\n  <phoneme py="ei1 ai1">AI</phoneme>\n  从"有大脑"升级到"有身体"，像真人一样自然表达和交互。\n</speak>' },
]

const customPresets = [
  ...widgetTemplates.map((t) => ({ label: t.name, ssml: t.ssml })),
]

function speakText() {
  const t = text.value.trim()
  if (!t || aiLoading.value) return
  if (t.startsWith('@')) {
    const cmd = t.slice(1).trim()
    if (!cmd) return
    text.value = ''
    isCommandMode.value = true
    aiSend(`${cmd}\n\n（务必在回复末尾包含 <action>动作:参数</action> 控制标签。可用动作：init/speak/walk/interrupt/volume/power-on/power-off/template:图片展示|视频播放|网站链接|3D模型|文本卡片|多模态组合|背景音乐/bg/panel-on/panel-off/devtools-on/devtools-off/subtitle-on/subtitle-off/bg-on/bg-off）`)
    return
  }
  if (t.startsWith('?')) {
    const question = t.slice(1).trim()
    if (!question) return
    text.value = ''
    isCommandMode.value = false
    aiSend(`请用简洁的口语回答，不超过100字，适合数字人播报：${question}`)
    return
  }
  sdk?.executeSsml(`<speak>${t}</speak>`)
  text.value = ''
}

// AI 完成后
watch(aiLoading, (now, was) => {
  if (was && !now) {
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant' && messages.value.length - 1 > lastAiSpoken.value) {
      lastAiSpoken.value = messages.value.length - 1
      if (isCommandMode.value) {
        const action = parseAction(last.content)
        if (action) executeAction(action)
      }
    }
    isCommandMode.value = false
    nextTick(() => inputEl.value?.focus())
  }
})

function cleanForSpeech(text: string): string {
  return text.replace(/<action>[\s\S]*?<\/action>/g, '').replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '').replace(/[#*_~>\[\]|\\-]/g, '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function parseAction(text: string): { type: string; arg?: string } | null {
  const m = text.match(/<action>([\s\S]*?)<\/action>/)
  if (!m) return null
  const inner = m[1].trim()
  if (!inner) return null
  const colon = inner.indexOf(':')
  if (colon === -1) return { type: inner }
  return { type: inner.slice(0, colon).trim(), arg: inner.slice(colon + 1).trim() }
}

function executeAction(a: { type: string; arg?: string }) {
  const xSdk = (window as any).__xmovSdk
  const ui = (window as any).__youlingUi
  if (!ui && !xSdk) return
  switch (a.type) {
    case 'speak': xSdk?.speak(`<speak>${a.arg}</speak>`, true, true); break
    case 'template': { const ssml = _tplMap[a.arg!]; if (ssml) xSdk?.speak(ssml, true, true); break }
    case 'walk': {
      const labels = walkLabels.value
      const target = labels.includes(a.arg!) ? a.arg! : labels[labels.length - 1] || a.arg!
      xSdk?.speak(`<speak><ue4event><type>walk</type><data><target>${target}</target></data></ue4event></speak>`, true, true)
      break
    }
    case 'interrupt': xSdk?.interrupt('user'); break
    case 'volume': if (ui?.setVolume) { ui.setVolume(Number(a.arg)) } else { xSdk?.setVolume(Number(a.arg) / 100) }; break
    case 'bg': ui?.setBg(a.arg!); break
    case 'panel-on': ui?.showPanel(); break
    case 'panel-off': ui?.hidePanel(); break
    case 'devtools-on': ui?.showDevTools(); break
    case 'devtools-off': ui?.hideDevTools(); break
    case 'subtitle-on': ui?.subtitleOn(); break
    case 'subtitle-off': ui?.subtitleOff(); break
    case 'bg-on': ui?.bgOn(); break
    case 'bg-off': ui?.bgOff(); break
    case 'init': ui?.initSdk(); break
    case 'power-off': ui?.powerOff(); break
    case 'power-on': ui?.powerOn(); break
    case 'widget-clear': ui?.clearWidgets(); break
    case 'character': ui?.setCharacter(a.arg!); break
    case 'voice': ui?.setVoice(a.arg!); break
    case 'sdk-bg': ui?.setSdkBg(a.arg!); break
    case 'style': ui?.setStyle(a.arg!); break
    case 'apply-config': ui?.applyConfig(); break
    case 'devtools-size': {
      if (a.arg) {
        if (a.arg.startsWith('+') || a.arg.startsWith('-')) {
          const [dw, dh] = a.arg.slice(1).split(',').map(Number)
          const sign = a.arg.startsWith('-') ? -1 : 1
          const cur = ui?.getDevSize()
          if (cur) ui?.setDevSize(cur.w + sign * dw, cur.h + sign * dh)
        } else {
          const parts = a.arg.split(/[,xX]/).map(Number)
          if (parts.length === 2) ui?.setDevSize(parts[0], parts[1])
        }
      }
      break
    }
  }
}

function clickExample(label: string, ssml: string) {
  lastClickedLabel.value = label
  const target = extractWalkTarget(ssml)
  if (target) lastWalkTarget.value = target
  sdk?.executeSsml(ssml)
}
function execute(ssml: string) { sdk?.executeSsml(ssml) }
function stop() { sdk?.interrupt() }
function toggleFullscreen() {
  const ui = (window as any).__youlingUi
  if (!ui) return
  if (document.fullscreenElement) ui.exitFullscreen()
  else ui.doBrowserFullscreen()
}
</script>

<style scoped>
.demo-bar {
  position: fixed;
  z-index: 15;
  display: flex;
  flex-direction: row;
  gap: 4px;
  background: rgba(10, 12, 16, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 6px 10px;
  min-width: 480px;
  max-width: 95vw;
  transition: opacity 0.3s;
  user-select: none;
  cursor: grab;
  touch-action: none;
}
.demo-bar:active { cursor: grabbing; }
.demo-drag {
  display: flex; align-items: center; justify-content: center;
  width: 18px; flex-shrink: 0;
  color: rgba(255,255,255,0.3); font-size: 14px;
}
.demo-inner { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }

.demo-templates { display: flex; flex-direction: column; gap: 4px; }
.demo-row { display: flex; align-items: center; gap: 6px; }
.demo-row--state { padding-bottom: 4px; margin-bottom: 2px; }
.demo-row-label { font-size: 10px; color: rgba(255,255,255,0.3); white-space: nowrap; min-width: 50px; text-align: right; flex-shrink: 0; }
.demo-row-btns { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
.demo-tpl-btn {
  padding: 3px 8px; font-size: 11px; font-family: inherit;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7); cursor: pointer; border-radius: 5px;
  transition: all 0.12s; white-space: nowrap;
}
.demo-tpl-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25); color: #fff; }
.demo-tpl-btn:active { transform: scale(0.93); transition: transform 0.08s; }
.demo-tpl-btn.active { background: rgba(126,231,135,0.2); border-color: rgba(126,231,135,0.35); color: #7ee787; }
.demo-state-btn.active { background: rgba(0,229,255,0.2); border-color: rgba(0,229,255,0.35); color: #00e5ff; }
.demo-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.1); margin-left: 4px; flex-shrink: 0; }

.demo-bar.dimmed { opacity: 0.2; }
.demo-bar.dimmed:hover { opacity: 1; }

.demo-input-row { display: flex; gap: 6px; align-items: center; }
.demo-ai-badge {
  font-size: 10px; color: #7ee787; white-space: nowrap;
  animation: pulse-ai 1.2s ease-in-out infinite;
  padding: 2px 6px; background: rgba(126,231,135,0.1); border-radius: 4px; flex-shrink: 0;
}
@keyframes pulse-ai { 0%,100%{opacity:0.6} 50%{opacity:1} }
.demo-input {
  flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  color: #fff; font-size: 12px; font-family: inherit; padding: 6px 10px; border-radius: 6px; outline: none;
  caret-color: #fff; transition: border-color 0.2s;
}
.demo-input::placeholder { color: rgba(255,255,255,0.3); }
.demo-input.ai-mode { border-color: rgba(126,231,135,0.4); box-shadow: 0 0 8px rgba(126,231,135,0.08); }
.demo-input:disabled { opacity: 0.5; }
.demo-send {
  padding: 6px 14px; font-size: 12px; font-family: inherit;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
  color: #fff; font-weight: 600; cursor: pointer; border-radius: 6px;
  transition: all 0.15s; white-space: nowrap;
}
.demo-send.ai-send { background: rgba(126,231,135,0.2); border-color: rgba(126,231,135,0.35); color: #7ee787; }
.demo-send:hover:not(:disabled) { background: rgba(255,255,255,0.25); }
.demo-send.ai-send:hover:not(:disabled) { background: rgba(126,231,135,0.3); }
.demo-send:disabled { opacity: 0.3; cursor: not-allowed; }
.demo-stop {
  padding: 6px 10px; font-size: 12px; font-family: inherit;
  background: rgba(220,60,60,0.25); border: 1px solid rgba(220,60,60,0.35);
  color: #f99; cursor: pointer; border-radius: 6px; transition: all 0.15s; white-space: nowrap;
}
.demo-stop:hover:not(:disabled) { background: rgba(220,60,60,0.4); color: #fcc; }
.demo-stop:disabled { opacity: 0.2; cursor: not-allowed; }
.demo-disconnect-btn {
  background: rgba(220,60,60,0.15) !important;
  border-color: rgba(220,60,60,0.25) !important;
  color: #f99 !important;
}
.demo-disconnect-btn:hover {
  background: rgba(220,60,60,0.3) !important;
  border-color: rgba(220,60,60,0.4) !important;
  color: #fcc !important;
}
.demo-fullscreen {
  padding: 6px 8px; font-size: 14px; font-family: inherit;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5); cursor: pointer; border-radius: 6px;
  transition: all 0.15s; line-height: 1;
}
.demo-fullscreen:hover { background: rgba(255,255,255,0.14); color: #fff; }
</style>
