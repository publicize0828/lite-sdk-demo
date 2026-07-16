<script setup lang="ts">
import { ref, reactive, watch, computed, provide, onUnmounted } from 'vue'
import RenderCanvas from './components/RenderCanvas.vue'
import ConfigDrawer from './components/ConfigDrawer.vue'

import TabPanel from './components/TabPanel.vue'
import DemoControlBar from './components/DemoControlBar.vue'
import PerformanceHUD from './components/PerformanceHUD.vue'
import CustomWidgetOverlay from './components/CustomWidgetOverlay.vue'
import { useSDK, useLogs } from './composables/useSDK'
import { useDrag } from './composables/useDrag'
import { useSdkWidgets } from './composables/useSubtitle'
import { useCustomWidget } from './composables/useCustomWidget'
import { useFullscreen } from './composables/useFullscreen'
import { useYoulingApi } from './composables/useYoulingApi'
import { characterMap, voiceMap, bgMap, characterVoices, driveStyleMap } from './config/constants'
import { generateConfig as buildConfigJson } from './config/generateConfig'
import { buildWalkConfig, walkLabels, lastWalkTarget } from './utils/walk'
import { useLayout, themeLayout } from './composables/useLayout'
import { SdkKey } from './types'

// ====== 日志 ======
const { logs, codeSnippets, addLog, addApiCall, addCodeSnippet } = useLogs()

// ====== SDK ======
const {
  isInitialized, isInitializing, downloadProgress, performanceStats, lastInitError, sessionAlert,
  initSDK, executeSsml, interrupt, setVolume, offline, online, flushSpeakQueue, waitForOnline, destroy, currentSpeakState, currentWalkState,
} = useSDK('#sdk-container', { addLog, addApiCall, addCodeSnippet })

provide(SdkKey, { executeSsml, interrupt, setVolume, offline, online, flushSpeakQueue, waitForOnline, destroy, initSDK })

// ====== 凭证 & 配置 ======
const credentials = reactive({
  appId: import.meta.env.VITE_APP_ID ?? '',
  appSecret: import.meta.env.VITE_APP_SECRET ?? '',
  gatewayServer: import.meta.env.VITE_GATEWAY_SERVER ?? '',
})

const character = ref('')
const voice = ref('')
const background = ref('')
const driveStyle = ref('')
const configText = ref('')
const volume = ref(80)
const REINIT_DELAY = 1000

// ====== 布局 & 主题 ======
const bgTheme = ref('white')
const { screenLayout, defaultLayout, themeBgUrl } = useLayout(bgTheme)
const canvasStyle = computed(() => {
  const ly = themeLayout[bgTheme.value]
  if (!ly) return {}
  return { width: ly.cw + 'px', height: ly.ch + 'px' }
})
const showAppBg = computed(() => sdkWidgets.bgVisible.value)
const isWalking = computed(() => !!currentWalkState.value)

// ====== SDK 控件（背景/字幕） ======
const { clear: clearWidgets } = useCustomWidget()
const sdkWidgets = useSdkWidgets()
const subtitleEnabled = sdkWidgets.subtitleVisible

// ====== 初始化 & 配置 ======
function generateConfig() {
  configText.value = buildConfigJson({
    character: character.value,
    voice: voice.value,
    background: background.value,
    driveStyle: driveStyle.value,
    defaultLayout,
    screenLayout,
    isSdkBgVisible: sdkWidgets.bgVisible.value,
  })
}

async function onInit() {
  destroy()
  const bg = bgMap[background.value] ?? bgMap.transparent
  const config = sdkWidgets.bgVisible.value ? defaultLayout(bg) : screenLayout()
  const ok = await initSDK({ ...credentials, config })
  if (ok) { generateConfig(); setVolume(volume.value); executeSsml('<speak>你好，我是你的数字人助手</speak>') }
  else alert(`初始化失败：${lastInitError.value || '未知错误'}`)
}

async function applyConfig() {
  generateConfig()
  try {
    destroy()
    await new Promise(r => setTimeout(r, REINIT_DELAY))
    const config = JSON.parse(configText.value)
    const ok = await initSDK({ ...credentials, config })
    if (!ok) {
      alert(`初始化失败：${lastInitError.value || '未知错误'}`)
    } else {
      setVolume(volume.value)
    }
  } catch { alert('// ERROR: JSON 格式错误') }
}

// ====== 背景切换 ======
const poweredOff = ref(false)

watch(() => sdkWidgets.bgVisible.value, (v) => {
  ;(window as any).__youlingUi.isScreenMode = !v
  if (v) {
    poweredOff.value = false
    const sdk = (window as any).__xmovSdk
    if (!sdk?.changeLayout || !isInitialized.value) return
    const bg = bgMap[background.value] ?? bgMap.transparent
    const cw = bg?.cw ?? window.innerWidth
    const ch = bg?.ch ?? window.innerHeight
    sdk.changeLayout({
      container: { size: [cw, ch] },
      avatar: { v_align: 'bottom', h_align: 'right', scale: bg?.scale ?? 0.3, offset_x: 0, offset_y: bg?.offsetY ?? 0 },
    })
    addApiCall('changeLayout', JSON.stringify({ container: [cw, ch], scale: bg?.scale ?? 0.3 }))
    addCodeSnippet(`sdk.changeLayout({ container: [${cw}, ${ch}], scale: ${bg?.scale ?? 0.3} })`)
    const wc = buildWalkConfig(cw)
    walkLabels.value = wc.labels
    sdk.changeWalkConfig?.(wc)
    addApiCall('changeWalkConfig', JSON.stringify({ walk_points: wc.walk_points, init_point: wc.init_point }))
    addCodeSnippet(`sdk.changeWalkConfig({ walk_points: {${wc.labels.map(l => `${l}:${wc.walk_points[l]}`).join(',')}}, init_point: ${wc.init_point} })`)
    const centerLabel = wc.labels[Math.floor(wc.labels.length / 2)]
    lastWalkTarget.value = centerLabel
    sdk.speak(`<speak>正在移动到中心位置<ue4event><type>walk</type><data><target>${centerLabel}</target></data></ue4event></speak>`, true, true)
    addLog('行走', `SDK 背景 => cw=${cw}, 点位(${wc.labels.length}): ${wc.labels.join(',')} | walk_points: ${JSON.stringify(wc.walk_points)} | init_point=${wc.init_point} 走到中心${centerLabel}`)
  } else {
    if (!isInitialized.value) return
    ;(window as any).__youlingUi?.changeBgLayout(bgTheme.value)
  }
})

watch(volume, (v) => { setVolume(v); addCodeSnippet(`sdk.setVolume(${v / 100})`) })
watch(currentSpeakState, (s) => {
  ;(window as any).__youlingUi.isSpeaking = s === 'start'
})

function changeBgLayout(key: string) {
  if (!isInitialized.value) return
  const ly = themeLayout[key]
  if (!ly) return
  const sdk = (window as any).__xmovSdk
  if (!sdk?.changeLayout) return
  sdk.changeLayout({
    container: { size: [ly.cw, ly.ch] },
    avatar: { v_align: 'bottom', h_align: 'right', scale: ly.scale, offset_x: 0, offset_y: 0 },
  })
  addApiCall('changeLayout', JSON.stringify({ container: [ly.cw, ly.ch], scale: ly.scale.toFixed(1) }))
  addCodeSnippet(`sdk.changeLayout({ container: [${ly.cw}, ${ly.ch}], scale: ${ly.scale.toFixed(1)} })`)
  const wcBg = buildWalkConfig(ly.cw)
  walkLabels.value = wcBg.labels
  sdk.changeWalkConfig?.(wcBg)
  addApiCall('changeWalkConfig', JSON.stringify({ walk_points: wcBg.walk_points, init_point: wcBg.init_point }))
  addCodeSnippet(`sdk.changeWalkConfig({ walk_points: {${wcBg.labels.map(l => `${l}:${wcBg.walk_points[l]}`).join(',')}}, init_point: ${wcBg.init_point} })`)
  const centerLabel = wcBg.labels[Math.floor(wcBg.labels.length / 2)]
  lastWalkTarget.value = centerLabel
  sdk.speak(`<speak>正在移动到中心位置<ue4event><type>walk</type><data><target>${centerLabel}</target></data></ue4event></speak>`, true, true)
  addLog('行走', `大屏[${key}] => cw=${ly.cw}, 点位(${wcBg.labels.length}): ${wcBg.labels.join(',')} | walk_points: ${JSON.stringify(wcBg.walk_points)} | init_point=${wcBg.init_point} 走到中心${centerLabel}`)
}

watch(bgTheme, (key) => {
  if (!key || !isInitialized.value) return
  sdkWidgets.hideBg();
  changeBgLayout(key)
})

// ====== 窗口 resize ======
function onResize() {
  const sdk = (window as any).__xmovSdk
  if (!sdk?.changeWalkConfig) return
  if (showAppBg.value) {
    const wcFull = buildWalkConfig(window.innerWidth)
    walkLabels.value = wcFull.labels
    sdk.changeWalkConfig(wcFull)
    addApiCall('changeWalkConfig', JSON.stringify({ walk_points: wcFull.walk_points, init_point: wcFull.init_point }))
    addCodeSnippet(`sdk.changeWalkConfig({ walk_points: {${wcFull.labels.map(l => `${l}:${wcFull.walk_points[l]}`).join(',')}}, init_point: ${wcFull.init_point} })`)
    addLog('行走', `resize SDK背景 => cw=${window.innerWidth}, 点位(${wcFull.labels.length}): ${wcFull.labels.join(',')} | walk_points: ${JSON.stringify(wcFull.walk_points)}`)
  } else {
    const ly = themeLayout[bgTheme.value]
    if (ly) {
      const wcLy = buildWalkConfig(ly.cw)
      walkLabels.value = wcLy.labels
      sdk.changeWalkConfig(wcLy)
      addApiCall('changeWalkConfig', JSON.stringify({ walk_points: wcLy.walk_points, init_point: wcLy.init_point }))
      addCodeSnippet(`sdk.changeWalkConfig({ walk_points: {${wcLy.labels.map(l => `${l}:${wcLy.walk_points[l]}`).join(',')}}, init_point: ${wcLy.init_point} })`)
      addLog('行走', `resize 大屏[${bgTheme.value}] => cw=${ly.cw}, 点位(${wcLy.labels.length}): ${wcLy.labels.join(',')} | walk_points: ${JSON.stringify(wcLy.walk_points)}`)
    }
  }
}
window.addEventListener('resize', onResize)

// ====== 全屏 ======
const fullscreen = useFullscreen()

// ====== UI 控制 API（挂 window 供 DemoControlBar / AI 命令访问） ======
const DEV_MIN_W = 640, DEV_MIN_H = 570, DEV_MAX_W = 1600, DEV_MAX_H = 1200
const showConfigDrawer = ref(true)

// 魔搭模式检测（isModelScopeMode 供 ConfigDrawer 使用，不可删除）
const isModelScopePreview = import.meta.env.VITE_MODELSCOPE_PREVIEW === 'true'
const isModelScopeMode = typeof window !== 'undefined' && !!window.__ENV__ || isModelScopePreview
const isOSSDeploy = import.meta.env.PROD && !isModelScopeMode
const showCredOnStart = isModelScopeMode || isOSSDeploy



function onCredentialsUpdate(v: typeof credentials) {
  Object.assign(credentials, v)
}
const showFloating = ref(true)
const devW = ref(DEV_MIN_W)
const devH = ref(DEV_MIN_H)
const devFullscreen = ref(false)

function toggleDevFullscreen() {
  devFullscreen.value = !devFullscreen.value
}

const uiApi = useYoulingApi({
  showConfigDrawer, showFloating, sdkWidgets, bgTheme, volume, poweredOff,
  addCodeSnippet, clearWidgets, offline, destroy,
  character, voice, background, driveStyle,
  onInit, applyConfig,
  devW, devH,
  fullscreen,
  changeBgLayout,
  logApi: addCodeSnippet,
})
;(window as any).__youlingUi = uiApi


// ====== DevTools 拖拽 ======
const { x: floatX, y: floatY, onPointerDown, onPointerMove, onPointerUp } = useDrag(
  window.innerWidth - 520, window.innerHeight - 420,
)

// DevTools 右下角缩放（2D，useResize 仅支持 1D，保留内联）
const resizing = ref(false)
let _rsX = 0, _rsY = 0, _rsW = 0, _rsH = 0
function onResizeDown(e: PointerEvent) {
  resizing.value = true
  _rsX = e.clientX; _rsY = e.clientY; _rsW = devW.value; _rsH = devH.value
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault(); e.stopPropagation()
}
function onResizeMove(e: PointerEvent) {
  if (!resizing.value) return
  devW.value = Math.min(DEV_MAX_W, Math.max(DEV_MIN_W, _rsW + (e.clientX - _rsX)))
  devH.value = Math.min(DEV_MAX_H, Math.max(DEV_MIN_H, _rsH + (e.clientY - _rsY)))
}
function onResizeUp() { resizing.value = false }

// ====== 清理 ======
const handleBeforeUnload = () => { destroy(); window.removeEventListener('resize', onResize) }
window.addEventListener('beforeunload', handleBeforeUnload)
onUnmounted(() => { window.removeEventListener('beforeunload', handleBeforeUnload) })
</script>

<template>
  <div class="app-root" :style="!showAppBg && themeBgUrl ? { backgroundColor: '#0c0e12' } : {}">
    <div class="canvas-fullscreen" :class="{ 'no-frame': showAppBg }" :style="showAppBg ? {} : canvasStyle">
      <img v-if="!showAppBg && bgTheme !== 'white'" :src="themeBgUrl" class="canvas-bg" />
      <RenderCanvas :initialized="isInitialized" :initializing="isInitializing" :download-progress="downloadProgress" />
      <CustomWidgetOverlay />
      <Transition name="power-fade">
        <div v-if="poweredOff" class="power-off-overlay"></div>
      </Transition>
    </div>

    <DemoControlBar />



    <Transition name="alert-fade">
      <div v-if="sessionAlert" class="session-alert-overlay" @click="sessionAlert = ''">
        <div class="session-alert-box" @click.stop>
          <div class="session-alert-icon">!</div>
          <div class="session-alert-title">会话连接失败</div>
          <div class="session-alert-msg">{{ sessionAlert.replace('会话连接失败：', '') }}</div>
          <div class="session-alert-hint">当前暂无可用房间或并发已满，请稍后重试或联系管理员</div>
          <button class="session-alert-btn" @click="sessionAlert = ''">我知道了</button>
        </div>
      </div>
    </Transition>

    <PerformanceHUD :perf="{ fps: performanceStats.fps, driveResponseTime: performanceStats.driveResponseTime, interruptLatency: performanceStats.interruptLatency }" />
    
    <ConfigDrawer
      v-show="!fullscreen.isFullscreen.value"
      v-model:volume="volume"
      v-model:subtitle="subtitleEnabled"
      v-model:visible="showConfigDrawer"
      v-model:sdk-bg-visible="sdkWidgets.bgVisible.value"
      v-model:bg-theme="bgTheme"
      :credentials="credentials"
      :initializing="isInitializing"
      :walking="isWalking"
      :dev-tools-visible="showFloating"
      :is-model-scope="isModelScopeMode"
      @update:credentials="onCredentialsUpdate"
      @init="onInit"
      @toggle-devtools="showFloating = !showFloating"
    />

    <div v-show="showFloating && !fullscreen.isFullscreen.value" class="floating-panel" :class="{ 'dev-fullscreen': devFullscreen }" :style="devFullscreen ? {} : { left: floatX + 'px', top: floatY + 'px', width: devW + 'px', height: devH + 'px' }">
      <div class="drag-handle"
        @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp">
        <span class="drag-title">DevTools</span>
        <div class="drag-actions">
          <button class="drag-fullscreen" @click="toggleDevFullscreen" :title="devFullscreen ? '退出全屏' : 'DevTools 全屏'">{{ devFullscreen ? '⛶' : '⛶' }}</button>
          <button class="drag-close" @click="showFloating = false">×</button>
        </div>
      </div>
      <div class="floating-body">
        <TabPanel :logs="logs" :code-snippets="codeSnippets" :perf="performanceStats" :credentials="credentials" />
      </div>
      <div v-if="!devFullscreen" class="resize-handle" @pointerdown="onResizeDown" @pointermove="onResizeMove" @pointerup="onResizeUp"></div>
    </div>

    <button v-if="!showFloating && !fullscreen.isFullscreen.value" class="floating-toggle" @click="showFloating = true">&gt;_</button>

    <div v-if="fullscreen.pendingFullscreen.value" class="fullscreen-prompt" @click="fullscreen.activateFullscreen">
      <span>点击画面进入全屏</span>
    </div>

    <button v-if="fullscreen.isFullscreen.value" class="fullscreen-exit" @click="fullscreen.exitFullscreen" title="退出全屏 (ESC)">✕</button>
  </div>
</template>

<style scoped>
.app-root {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background .3s;
  background-color: #1a1a1a;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,.015) 1px, rgba(255,255,255,.015) 2px), radial-gradient(ellipse at 50% 40%, #333 0%, #1a1a1a 60%, #0a0a0a 100%);
}
.canvas-fullscreen {
  position: relative;
  z-index: 0;
  pointer-events: none;
  flex-shrink: 0;
  border: 2px solid #444;
  border-radius: 6px;
  box-shadow: 0 0 0 14px #0d0d0d, 0 0 0 16px #1a1a1a, 0 0 0 18px #333, 0 0 0 34px #050505, 0 16px 80px rgba(0,0,0,.95), inset 0 0 0 1px rgba(255,255,255,.03), 0 0 80px rgba(0,0,0,.5);
}
.canvas-fullscreen.no-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.canvas-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: -1;
}
.power-off-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  background: #000;
  pointer-events: all;
}
.power-fade-enter-active { transition: all .6s ease-in; }
.power-fade-leave-active { transition: all .3s ease-out; }
.power-fade-enter-from, .power-fade-leave-to { opacity: 0; }

.floating-panel {
  position: fixed;
  z-index: 110;
  min-width: 640px;
  min-height: 570px;
  background: var(--bg-panel);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 4px 4px 0 rgba(0,0,0,.1);
  user-select: none;
}
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--text);
  color: var(--bg-panel);
  cursor: move;
  flex-shrink: 0;
  touch-action: none;
}
.drag-title { font-size: 11px; font-weight: 600; }
.drag-actions { display: flex; align-items: center; gap: 2px; }
.drag-fullscreen, .drag-close {
  background: 0;
  border: none;
  color: var(--bg-panel);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.drag-fullscreen { font-size: 14px; opacity: .6; }
.drag-fullscreen:hover, .drag-close:hover { opacity: 1; }
.floating-panel.dev-fullscreen {
  inset: 0; width: 100vw !important; height: 100vh !important;
  border-radius: 0; border: none;
}
.floating-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 6px 10px;
}
.resize-handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 22px;
  height: 22px;
  cursor: nwse-resize;
  z-index: 31;
  border-radius: 0 0 4px 0;
}
.resize-handle::before, .resize-handle::after {
  content: '';
  position: absolute;
  border-right: 2.5px solid rgba(255,255,255,.45);
  border-bottom: 2.5px solid rgba(255,255,255,.45);
}
.resize-handle::before { right: 13px; bottom: 5px; width: 5px; height: 5px; }
.resize-handle::after { right: 6px; bottom: 5px; width: 10px; height: 10px; }
.resize-handle:hover::before, .resize-handle:hover::after { border-color: rgba(255,255,255,.7); }

.floating-toggle {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 25;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--text);
  color: var(--bg-panel);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.fullscreen-prompt {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.fullscreen-prompt span {
  background: rgba(255,255,255,.12);
  color: #fff;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  border: 1px solid rgba(255,255,255,.2);
  animation: pulse-fs 2s ease-in-out infinite;
}
@keyframes pulse-fs { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
.fullscreen-exit {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 50;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,.45);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(255,255,255,.15);
  opacity: .4;
  transition: opacity .2s;
}
.fullscreen-exit:hover { opacity: 1; }

.session-alert-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.session-alert-box {
  background: #1c1c24; border: 1px solid rgba(220,60,60,.4);
  border-radius: 16px; padding: 40px 48px;
  text-align: center; max-width: 440px; width: 90%;
  box-shadow: 0 24px 80px rgba(220,60,60,.15);
}
.session-alert-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(220,60,60,.15); border: 2px solid rgba(220,60,60,.4);
  color: #f66; font-size: 32px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
}
.session-alert-title { font-size: 20px; font-weight: 700; color: #f66; margin-bottom: 12px; }
.session-alert-msg { font-size: 13px; color: rgba(255,255,255,.6); margin-bottom: 8px; word-break: break-all; }
.session-alert-hint { font-size: 12px; color: rgba(255,255,255,.35); margin-bottom: 28px; }
.session-alert-btn {
  padding: 10px 40px; font-size: 14px; font-family: inherit;
  background: rgba(220,60,60,.2); border: 1px solid rgba(220,60,60,.35);
  color: #f99; border-radius: 8px; cursor: pointer;
}
.session-alert-btn:hover { background: rgba(220,60,60,.35); }

.alert-fade-enter-active { transition: all .3s ease-out; }
.alert-fade-leave-active { transition: all .2s ease-in; }
.alert-fade-enter-from, .alert-fade-leave-to { opacity: 0; }
</style>
