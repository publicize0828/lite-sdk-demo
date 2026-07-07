import { ref, shallowRef } from 'vue'
import type { SDKOptions, XmovAvatarInstance, LogEntry } from '../types'
import { useCustomWidget } from './useCustomWidget'
import { walkLabels } from '../utils/walk'
import { formatSdkError } from '../config/error-codes'

// ========== 日志管理 ==========

export interface ApiCallEntry {
  id: number
  time: string
  method: string
  params: string
}

export interface CodeSnippetEntry {
  id: number
  time: string
  code: string
}

export interface SdkLogger {
  addLog: (type: string, msg: string) => void
  addApiCall: (method: string, params: string) => void
  addCodeSnippet: (code: string) => void
}

export function useLogs() {
  const logs = ref<LogEntry[]>([])
  const apiCalls = ref<ApiCallEntry[]>([])
  const codeSnippets = ref<CodeSnippetEntry[]>([])
  let nextLogId = 1
  let nextApiId = 1
  let nextCodeId = 1

  function nowTime() { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}.${padMs(n.getMilliseconds())}` }

  function addLog(type: string, message: string) {
    logs.value.push({ id: nextLogId++, time: nowTime(), type, message })
    if (logs.value.length > 500) logs.value = logs.value.slice(-300)
  }

  function addApiCall(method: string, params: string) {
    apiCalls.value.push({ id: nextApiId++, time: nowTime(), method, params })
    if (apiCalls.value.length > 500) apiCalls.value = apiCalls.value.slice(-300)
  }

  function addCodeSnippet(code: string) {
    codeSnippets.value.push({ id: nextCodeId++, time: nowTime(), code })
    if (codeSnippets.value.length > 500) codeSnippets.value = codeSnippets.value.slice(-300)
  }

  function clearLogs() {
    logs.value.length = 0
    apiCalls.value.length = 0
    codeSnippets.value.length = 0
  }

  return { logs, apiCalls, codeSnippets, addLog, addApiCall, addCodeSnippet, clearLogs }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function padMs(n: number) {
  return String(n).padStart(3, '0')
}

// ========== SDK 管理 ==========

export function useSDK(containerId: string, logger: SdkLogger) {
  const { addLog, addApiCall, addCodeSnippet } = logger
  const sdkInstance = shallowRef<XmovAvatarInstance | null>(null)
  const isInitialized = ref(false)
  const isInitializing = ref(false)
  const downloadProgress = ref(0)
  const lastInitError = ref('')
  const subtitleText = ref('')
  const currentSpeakState = ref('')
  const currentWalkState = ref('')
  const currentStatus = ref<number | null>(null)
  const performanceStats = ref({
    fps: 0,
    driveResponseTime: 0,
    renderDuration: 0,
    networkRtt: 0,
    networkDownlink: 0,
    sdkStatus: '--',
    interruptLatency: 0,
  })

  // 帧率统计
  let frameCount = 0
  let lastFpsTime = performance.now()
  let fpsRafId = 0

  function startFpsMonitor() {
    function tick() {
      frameCount++
      const now = performance.now()
      if (now - lastFpsTime >= 1000) {
        performanceStats.value = {
          ...performanceStats.value,
          fps: frameCount,
        }
        frameCount = 0
        lastFpsTime = now
      }
      fpsRafId = requestAnimationFrame(tick)
    }
    fpsRafId = requestAnimationFrame(tick)
  }

  function stopFpsMonitor() {
    if (fpsRafId) cancelAnimationFrame(fpsRafId)
  }

  const speakMap: Record<string, string> = { start: '开始说话', end: '说话结束' }
  const walkMap: Record<string, string> = { start: '开始行走', end: '行走结束', walking: '行走中' }
  const actionMap: Record<string, string> = { start: '动作开始', end: '动作结束' }

  // 记录最后一次执行的 SSML 类型，用于 onSpeakStateChange 时输出对应日志
  let _lastAction = ''
  // 记录 speak 发送时间和 SDK 返回的首帧耗时，用于计算驱动响应时间
  let _sendSpeakTime = 0
  let _renderDuration = 0
  // 追踪 SDK 语音状态，防止重复发送 start:true 的 speak
  let _voiceState = 'end'

  const sessionAlert = ref('')

  const callbacks = {
    onMessage(message: any) {
      const msg = formatSdkError(message) || (message?.message ?? JSON.stringify(message))
      const code = message?.code ?? ''
      addLog('错误', `[${code}] ${msg}`)
      addCodeSnippet(`// SDK onMessage: ${JSON.stringify(message)}`)
      if (/10005|并发.*满|session.*满|上限|limit.*full|暂无可用/i.test(`${code} ${msg}`)) {
        sessionAlert.value = msg || '暂无可用房间或并发已满，请稍后重试'
      }
    },
    onStartSessionWarning(message: any) {
      const msg = JSON.stringify(message)
      addLog('错误', `[警告] ${msg}`)
      addCodeSnippet(`// SDK onStartSessionWarning: ${msg}`)
      if (/并发|满|上限|limit|full|暂无可用/i.test(msg)) {
        sessionAlert.value = '暂无可用房间或并发已满，请稍后重试'
      }
    },
    onNetworkInfo(info: any) {
      addLog('网络', `RTT=${info?.rtt ?? 0}ms, DL=${info?.downlink ?? 0}Mbps`)
      performanceStats.value = {
        ...performanceStats.value,
        networkRtt: info?.rtt ?? 0,
        networkDownlink: info?.downlink ?? 0,
      }
    },
    onStateChange(state: string) {
      addLog('状态', `状态切换 → ${state}`)
      addCodeSnippet(`// SDK onStateChange: "${state}"`)
    },
    onStateRenderChange(state: string, duration: number) {
      addLog('状态', `首帧耗时 ${duration}ms`)
      addCodeSnippet(`// SDK onStateRenderChange: state="${state}", duration=${duration}ms`)
      _renderDuration = duration
      if (duration > 0) {
        performanceStats.value = {
          ...performanceStats.value,
          renderDuration: duration,
          driveResponseTime: performanceStats.value.driveResponseTime || duration,
        }
      }
    },
    onSpeakStateChange(state: string, client_speak_id: string) {
      currentSpeakState.value = state
      addCodeSnippet(`// SDK onSpeakStateChange: state="${state}", id="${client_speak_id}"`)
      if (state === 'speak_start') currentWalkState.value = 'walking'
      if (_lastAction === 'walk') {
        addLog('行走', state.includes('start') ? '开始行走' : '行走结束')
      } else if (_lastAction === 'action') {
        addLog('动作', state.includes('start') ? '动作开始' : '动作结束')

      } else {
        addLog('说话', state.includes('start') ? '开始说话' : '说话结束')
        if (state === 'speak_end') _lastAction = ''
      }
      if (state === 'speak_end') currentWalkState.value = '', _lastAction = ''
    },
    onRenderChange(state: string) {
      if (state !== 'rendering') {
        addCodeSnippet(`// SDK onRenderChange: state="${state}"`)
        addLog('状态', `渲染${state}`)
      }
    },
    onVoiceStateChange(state: string, duration?: number) {
      _voiceState = state
      addLog('说话', state === 'start' ? '音频开始' : '音频结束')
      addCodeSnippet(`// SDK onVoiceStateChange: state="${state}", duration=${duration ?? 'N/A'}ms`)
      if (state === 'start') {
        const d = duration || _renderDuration || (_sendSpeakTime ? Date.now() - _sendSpeakTime : 0)
        if (d > 0) {
          performanceStats.value = {
            ...performanceStats.value,
            driveResponseTime: d,
          }
        }
      }
    },
    onStatusChange(status: any) {
      currentStatus.value = status
      const map: Record<number, string> = { 0: '在线', 1: '离线', 2: '关闭', 3: '可见', 4: '不可见' }
      performanceStats.value = {
        ...performanceStats.value,
        sdkStatus: map[status] ?? String(status),
      }
      addLog('状态', `连接${map[status] || status}`)
      addCodeSnippet(`// SDK onStatusChange: status=${status} (${map[status] || '未知'})`)
    },
    onWalkStateChange(status: string) {
      currentWalkState.value = status
      addLog('行走', walkMap[status] || status)
      addCodeSnippet(`// SDK onWalkStateChange: status="${status}"`)
    },
    onFPSUpdate(stats: { current: number; average?: number; min?: number; max?: number }) {
      performanceStats.value = {
        ...performanceStats.value,
        fps: stats.current,
      }
    },
  }

  const { proxyWidget } = useCustomWidget(addCodeSnippet)

  function createSDK(options: {
    appId: string
    appSecret: string
    config?: any
  }) {
    if (sdkInstance.value) {
      return sdkInstance.value
    }
    const urlTag = new URLSearchParams(window.location.search).get('tag')
    const opts: SDKOptions = {
      containerId,
      ...options,
      gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
      ...(urlTag ? { tag: urlTag } : {}),
      enableClientInterrupt: false,
      enableLogger: import.meta.env.VITE_ENABLE_LOGGER !== 'false',
      env: 'production',
      proxyWidget,
      ...callbacks,
    }
    sdkInstance.value = new window.XmovAvatar(opts)
    startFpsMonitor()
    return sdkInstance.value
  }

  async function initSDK(options: {
    appId: string
    appSecret: string
    config?: any
  }): Promise<boolean> {
    if (isInitializing.value) return false
    isInitializing.value = true
    addLog('初始化', '开始初始化 SDK...')
    try {
      const sdk = createSDK(options)
      const downloadReady = new Promise<void>((resolve, reject) => {
        let lastProgress = 0
        sdk.init({
          onDownloadProgress(progress) {
            downloadProgress.value = progress
            lastProgress = progress
            if (progress >= 100) resolve()
          },
        }).then(() => {
          if (lastProgress < 100) resolve()
        }).catch(reject)
      })
      // 加超时保护，避免 downloadProgress 永远不到 100% 导致挂死
      const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error('SDK 初始化超时')), 30000))
      await Promise.race([downloadReady, timeout])
      isInitialized.value = true
      ;(window as any).__xmovSdk = sdk
      ;(window as any).__sdkInitialized = true
      addLog('初始化', 'SDK 初始化完成')
      addApiCall('init', JSON.stringify({}))
      addCodeSnippet(`await sdk.init()`)
      return true
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      lastInitError.value = msg
      addLog('错误', `初始化失败: ${msg}`)
      return false
    } finally {
      isInitializing.value = false
    }
  }

  function executeSsml(ssml: string) {
    const sdk = sdkInstance.value
    if (!sdk || !isInitialized.value) {
      addLog('警告', 'SDK 尚未初始化')
      return
    }
    if (_voiceState === 'start') {
      sdk.interrupt('user')
      sdk.idle()
      addLog('执行', '正在播报中，已打断后重新发送')
    }

    // 识别 SSML 中的动作类型
    const hasWalk = /<type>walk<\/type>/i.test(ssml)
    const hasKa = /<type>ka<\/type>/i.test(ssml) || /<type>ka_intent<\/type>/i.test(ssml)
    const hasUievent = /<type>uievent<\/type>/i.test(ssml) || /<uievent>/i.test(ssml)
    const tags: string[] = []
    if (hasWalk) tags.push('行走')
    if (hasKa) tags.push('动作')
    if (hasUievent) tags.push('自定义事件')
    const hasTags = tags.length > 0
    const label = hasTags ? `${tags.join('+')}` : '说话'

    // 记录动作类型，onSpeakStateChange 回调时输出对应的开始/结束日志
    if (hasWalk) _lastAction = 'walk'
    else if (hasKa) _lastAction = 'action'
    else _lastAction = 'speak'

    addLog(_lastAction === 'walk' ? '行走' : _lastAction === 'action' ? '动作' : '说话',
      `${label}: ${ssml.substring(0, 80)}${ssml.length > 80 ? '...' : ''}`)

    // 行走前校验目标标签在当前点位列表中
    if (hasWalk) {
      const targetMatch = ssml.match(/<target>(\w+)<\/target>/)
      if (targetMatch && walkLabels.value.length > 0 && !walkLabels.value.includes(targetMatch[1])) {
        addLog('警告', `行走目标 "${targetMatch[1]}" 不在当前点位列表中，已忽略`)
        return
      }
    }
    // 记录发送时间，用于驱动响应时间的 fallback 计算
    _sendSpeakTime = Date.now()
    _renderDuration = 0
    sdk.speak(ssml, true, true)
    addApiCall('speak', JSON.stringify({ ssml }))
    addCodeSnippet(`sdk.speak(\`${ssml}\`, true, true)`)
  }

  function interrupt() {
    const sdk = sdkInstance.value
    if (!sdk) return
    const latency = sdk.interrupt('user')
    if (typeof latency === 'number') {
      performanceStats.value = { ...performanceStats.value, interruptLatency: latency }
    }
    sdk.idle()
    addApiCall('interrupt', JSON.stringify({ type: 'user' }))
    addCodeSnippet(`sdk.interrupt('user'); sdk.idle()`)
    addLog('执行', '打断当前动作')
  }

  function setVolume(vol: number) {
    const sdk = sdkInstance.value
    if (!sdk) return
    sdk.setVolume(vol / 100)
    addApiCall('setVolume', JSON.stringify({ volume: vol / 100 }))
    addCodeSnippet(`sdk.setVolume(${vol / 100})`)
  }

  function offline() {
    const sdk = sdkInstance.value
    if (!sdk) return
    sdk.offlineMode()
    addApiCall('offlineMode', '{}')
    addCodeSnippet('sdk.offlineMode()')
    addLog('状态', '数字人已断开')
  }

  function destroy() {
    stopFpsMonitor()
    if (sdkInstance.value) {
      sdkInstance.value.offlineMode()
      sdkInstance.value.destroy()
      addCodeSnippet('sdk.offlineMode(); sdk.destroy()')
      sdkInstance.value = null
    }
    isInitialized.value = false
    ;(window as any).__xmovSdk = null
    ;(window as any).__sdkInitialized = false
    downloadProgress.value = 0
    subtitleText.value = ''
    _voiceState = 'end'
    _sendSpeakTime = 0
    _renderDuration = 0
  }

  return {
    sdkInstance,
    isInitialized,
    isInitializing,
    downloadProgress,
    subtitleText,
    currentSpeakState,
    currentWalkState,
    currentStatus,
    lastInitError,
    sessionAlert,
    performanceStats,
    initSDK,
    executeSsml,
    interrupt,
    setVolume,
    offline,
    destroy,
  }
}
