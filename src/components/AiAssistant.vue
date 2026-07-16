<template>
  <div class="terminal">
    <div class="scanline"></div>

    <div class="term-body" ref="msgContainer" @click="onCopyClick">
      <div v-if="messages.length === 0 && !loading" class="welcome">
        <div class="welcome-ascii">
   ___      ___ ___<br>
  /_\ \    / __| _ \<br>
 / _ \ \/\/ / _|   /___  ___ _ __ ___<br>
/_/ \_\_/\_/ |_|_\____/ __| '_ ` _ \<br>
                         \__ \ | | | | |<br>
                         |___/_| |_| |_|<br>
        </div>
        <p class="welcome-tag">数字人能力展示Demo 智能助手 <span class="beta-badge">Beta</span></p>
        <span class="welcome-sub">基于文档训练 · 知识库持续完善中 · 回答可能不准确 · DeepSeek V4 Pro 驱动</span>
        <div class="quick-asks">
          <button @click="send('怎么初始化 SDK？')"><span class="prompt">&gt;</span> 怎么初始化 SDK？</button>
          <button @click="send('如何让数字人边走边说？')"><span class="prompt">&gt;</span> 如何让数字人边走边说？</button>
          <button @click="send('SSML 支持哪些标签？')"><span class="prompt">&gt;</span> SSML 支持哪些标签？</button>
          <button @click="send('帮我实现一个数字人渲染的HTML页面')"><span class="prompt">&gt;</span> 帮我生成数字人 HTML 页面</button>
        </div>
        <button class="quick-feedback" @click="showFeedback = true">
          <span class="feedback-icon">💬</span>
          <span>提交反馈建议</span>
          <span class="feedback-arrow">→</span>
        </button>
      </div>

      <!-- 历史消息 -->
      <div v-for="(msg, i) in messages" :key="i" class="msg" :class="msg.role">
        <div class="msg-prefix">{{ msg.role === 'user' ? 'DEV@youling:~$' : 'AI@youling:~#' }}</div>
        <div class="msg-body" v-html="renderMd(msg.content)"></div>
        <button v-if="msg.role === 'assistant' && sdkReady" class="speak-btn" @click.stop="doSpeak(msg.content)">▶ 播报</button>
      </div>

      <!-- 流式输出中 -->
      <div v-if="loading" class="msg assistant">
        <div class="msg-prefix">AI@youling:~#</div>
        <div class="msg-body">
          <span v-if="currentReply" v-html="renderStreaming(currentReply)"></span>
          <span v-else class="loading-dots">思考中<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
        </div>
      </div>
    </div>

    <div class="term-input">
      <span class="prompt">DEV@youling:~$</span>
      <input
        ref="inputEl"
        v-model="input"
        type="text"
        placeholder="输入问题…"
        :disabled="loading"
        @keyup.enter="onSend"
        autofocus
      />
      <button class="send-btn" :disabled="loading || !input.trim()" @click="onSend">⏎</button>
      <button class="feedback-btn" @click="showFeedback = true" title="反馈建议">💬 反馈</button>
      <button class="clear-btn" @click="onClear" title="清空对话">clear</button>
    </div>

    <FeedbackModal :visible="showFeedback" @close="showFeedback = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAiChat } from '../composables/useAiChat'
import { widgetTemplates } from '../config/templates'
import FeedbackModal from './FeedbackModal.vue'

const { messages, loading, currentReply, send: aiSend, clear } = useAiChat()

const sdkReady = ref(false)
let _pollTimer = 0

onMounted(() => {
  _pollTimer = window.setInterval(() => {
    if ((window as any).__xmovSdk) {
      sdkReady.value = true
      clearInterval(_pollTimer)
    }
  }, 500)
})

onUnmounted(() => { clearInterval(_pollTimer) })

const input = ref('')
const showFeedback = ref(false)
const msgContainer = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const lastSpokenIdx = ref(-1)
const expectsAction = ref(false)
const retryCount = ref(0)
const pendingCommand = ref('')

// 滚动到底
watch(
  () => [messages.value.length, currentReply.value] as const,
  async () => {
    await nextTick()
    if (msgContainer.value) {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight
    }
  },
)

watch(
  () => messages.value.length,
  (len) => {
    if (!len) return
    const last = messages.value[len - 1]
    if (last.role === 'assistant' && lastSpokenIdx.value < len - 1) {
      lastSpokenIdx.value = len - 1
      const action = parseAction(last.content)
      if (action) {
        executeAction(action)
        last.content = last.content.replace(/<action>[\s\S]*?<\/action>/g, '').trim()
        expectsAction.value = false
        retryCount.value = 0
      } else if (expectsAction.value && retryCount.value < 3) {
        retryCount.value++
        messages.value.pop() // 删掉 AI 回复
        messages.value.pop() // 删掉用户消息
        lastSpokenIdx.value = messages.value.length - 1 // 重置索引
        const retryMsg = retryCount.value === 1
          ? `请重新回答，必须在回复末尾包含 <action> 控制标签。我的指令：${pendingCommand.value}`
          : `仍然没有 <action> 标签！请严格按格式：回复文字 + <action>动作:参数</action>。我的指令：${pendingCommand.value}`
        aiSend(retryMsg)
        return
      } else {
        expectsAction.value = false
        retryCount.value = 0
      }
    }
  },
)

function onSend() {
  const q = input.value.trim()
  if (!q || loading.value) return
  input.value = ''

  // 第一层：本地命令匹配
  const direct = matchCommand(q)
  if (direct) {
    executeAction(direct)
    messages.value.push({ role: 'user', content: q })
    messages.value.push({ role: 'assistant', content: `已执行：${describeAction(direct)}` })
    return
  }

  // 第二层：判断是否为命令类消息（需要 AI 生成 action 标签）
  const isCmd = isCommandIntent(q)
  expectsAction.value = isCmd
  pendingCommand.value = q
  retryCount.value = 0

  // 给 AI 注入格式要求
  const msg = isCmd
    ? `${q}\n\n（务必在回复末尾包含 <action>动作:参数</action> 控制标签，可用动作：speak/walk/interrupt/volume:数字/power-on/power-off/offline/character:heer(合耳)|xinhao(辛浩)/widget-clear/apply-config/init/template:图片展示|视频播放|网站链接|3D模型|文本卡片|多模态组合/devtools-size:宽,高/panel-on/panel-off/devtools-on/devtools-off/subtitle-on/subtitle-off/bg-on/bg-off/bg:warm(暖色)|dark(深色)|tech(科技)|image(商务))`
    : q
  send(msg)
}

const CMD_PATTERNS: [RegExp, (m: RegExpMatchArray) => { type: string; arg?: string } | null][] = [
  // 大屏场景切换（"场景"/"大屏"/"主题"，不含"背景"以避免与SDK背景混淆）
  [/大屏|场景|主题/, (m) => {
    const t = m.input!
    if (/暖色/.test(t)) return { type: 'bg', arg: 'warm' }
    if (/深色/.test(t)) return { type: 'bg', arg: 'dark' }
    if (/科技/.test(t)) return { type: 'bg', arg: 'tech' }
    if (/商务/.test(t)) return { type: 'bg', arg: 'image' }
    if (/白底/.test(t)) return { type: 'bg', arg: 'white' }
    return null
  }],
  // 收起/隐藏（面板|字幕|背景|devtools）
  [/收[起藏]|关[闭掉]|隐[藏蔽]|去[掉消]/, (m) => {
    if (/面板|配置|抽屉/.test(m.input!)) return { type: 'panel-off' }
    if (/字幕/.test(m.input!)) return { type: 'subtitle-off' }
    if (/背景|bg/i.test(m.input!)) return { type: 'bg-off' }
    if (/devtools|工具/.test(m.input!)) return { type: 'devtools-off' }
    return null
  }],
  // 打开/显示
  [/打[开显]|展[开示]|出来/, (m) => {
    if (/面板|配置|抽屉/.test(m.input!)) return { type: 'panel-on' }
    if (/字幕/.test(m.input!)) return { type: 'subtitle-on' }
    if (/背景|bg/i.test(m.input!)) return { type: 'bg-on' }
    if (/devtools|工具/.test(m.input!)) return { type: 'devtools-on' }
    return null
  }],
  // 音量
  [/(音量|声音).*(\d+)/, (m) => ({ type: 'volume', arg: m[2] })],
  [/(\d+).*(音量|声音)/, (m) => ({ type: 'volume', arg: m[1] })],
  [/(大|小|高|低).*声/, (m) => {
    if (/大|高/.test(m[1])) return { type: 'volume', arg: '80' }
    return { type: 'volume', arg: '30' }
  }],
  // 初始化
  [/初始化|init/i, (m) => {
    if (/数字人|sdk|SDK/.test(m.input!)) return { type: 'init' }
    return null
  }],
  // 打断
  [/打[断停]|停[止下]|别[说叫]|闭嘴|安静/, () => ({ type: 'interrupt' })],
  // 断开
  [/断[开连]|离[线网]|下[线网]/, () => ({ type: 'offline' })],
  // 开机/关机
  [/关机|关屏|熄屏|灭屏/, () => ({ type: 'power-off' })],
  [/开机|开屏|亮屏|点亮/, () => ({ type: 'power-on' })],
  // 关闭控件
  [/关闭.*(卡片|控件|弹窗|弹框|窗口)|收[起藏].*(卡片|控件|弹窗|弹框|窗口)/, () => ({ type: 'widget-clear' })],
  // 角色选择
  [/合耳/, () => ({ type: 'character', arg: 'heer' })],
  [/辛浩/, () => ({ type: 'character', arg: 'xinhao' })],
  // 应用配置
  [/应用配置|应用设置|重新加载/, () => ({ type: 'apply-config' })],
  // 行走
  [/走[到向]|去/, (m) => {
    const pt = m.input!.match(/[F-Uf-u]\b/)
    if (pt) return { type: 'walk', arg: pt[0].toUpperCase() }
    return null
  }],
  // DevTools 尺寸（增量调整，每次 +/-100x80）
  [/(devtools|工具).*(大|尺寸|缩放|变大|拉大)/i, (m) => ({ type: 'devtools-size', arg: '+100,+80' })],
  [/(devtools|工具).*(小|变小|拉小)/i, (m) => ({ type: 'devtools-size', arg: '-100,-80' })],
  // 播报
  [/说|播报|讲话|念/, (m) => {
    const idx = m.input!.search(/说|播报|讲话|念/)
    const after = m.input!.slice(idx + 1).replace(/^[：:说讲话播报念\s]+/, '').trim()
    if (after && after.length < 100) return { type: 'speak', arg: after }
    return null
  }],
]

function matchCommand(input: string): { type: string; arg?: string } | null {
  const q = input
  for (const [re, fn] of CMD_PATTERNS) {
    const m = q.match(re)
    if (m) {
      const result = fn(m)
      if (result) return result
    }
  }
  return null
}

function isCommandIntent(q: string): boolean {
  // 判断用户意图是否是控制操作（而非纯咨询问题）
  return /收[起藏]|关[闭掉]|隐[藏蔽]|打[开显]|展[开示]|音量|声音|主题|背景|打[断停]|停[止下]|别[说叫]|走[到向]|[说叫讲播]话|播报|初始化|大[小些]|变[大中小]|拉[大中小]|缩放|尺寸|角色|数字人|合耳|辛浩/.test(q)
}

function describeAction(a: { type: string; arg?: string }): string {
  const labels: Record<string, string> = {
    'panel-on': '已展开配置面板', 'panel-off': '已收起配置面板',
    'devtools-on': '已打开 DevTools', 'devtools-off': '已隐藏 DevTools',
    'subtitle-on': '字幕已开启', 'subtitle-off': '字幕已关闭',
    'bg-on': 'SDK 背景已显示', 'bg-off': 'SDK 背景已隐藏',
    'interrupt': '已打断当前动作',
    'volume': `音量已设为 ${a.arg}`,
    'speak': `数字人播报: ${a.arg}`,
    'walk': `走到点位 ${a.arg}`,
    'init': '正在初始化数字人 SDK...',
    'devtools-size': `DevTools 尺寸调整为 ${a.arg}`,
    'bg': '背景主题已切换',
    'power-off': '大屏已关机',
    'power-on': '大屏已开机',
    'widget-clear': '已关闭所有卡片',
    'offline': '数字人已断开',
  }
  return labels[a.type] ?? `已执行 ${a.type}`
}

function onClear() { clear(); lastSpokenIdx.value = -1; expectsAction.value = false; retryCount.value = 0; inputEl.value?.focus() }
function send(q: string) { aiSend(q) }

/* ===== 渲染已完成消息 ===== */
const codeCache: string[] = []

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
  const sdk = (window as any).__xmovSdk
  const ui = (window as any).__youlingUi
  if (!ui && !sdk) return

  switch (a.type) {
    case 'speak': sdk?.speak(`<speak>${a.arg}</speak>`, true, true); break
    case 'walk': sdk?.speak(`<speak><ue4event><type>walk</type><data><target>${a.arg}</target></data></ue4event></speak>`, true, true); break
    case 'interrupt': sdk?.interrupt('user'); break
    case 'offline': ui?.offline(); break
    case 'volume': if (ui?.setVolume) { ui.setVolume(Number(a.arg)) } else { sdk?.setVolume(Number(a.arg) / 100) }; break
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
    case 'template': {
      const tpl = widgetTemplates.find(t => t.name === a.arg)
      if (tpl) sdk?.speak(tpl.ssml, true, true)
      break
    }
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

function renderMd(text: string): string {
  codeCache.length = 0
  let html = text.replace(/<action>[\s\S]*?<\/action>/g, '')
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    codeCache.push(code.trim())
    return `%%BLOCK_${codeCache.length - 1}%%`
  })
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  html = html.replace(/`([^`]+)`/g, '<code class="il">$1</code>')
  html = html.replace(/%%BLOCK_(\d+)%%/g, (_, i) => {
    const escaped = codeCache[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<div class="code-block"><div class="code-bar"><span class="code-lang">CODE</span><button class="copy-btn">复制</button></div><pre><code>${escaped}</code></pre></div>`
  })
  return html
}

/* ===== 流式渲染（处理不完整的代码块） ===== */
function renderStreaming(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  // 完整代码块
  html = html.replace(/```(\w*)?<br>([\s\S]*?)<br>```/g, (_, lang, code) => {
    const clean = code.replace(/<br>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const escaped = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, '<br>')
    // wait, this is getting complicated. Let me simplify.
    return `<div class="code-block"><div class="code-bar"><span class="code-lang">CODE</span></div><pre><code>${escaped}</code></pre></div>`
  })

  // 不完整的代码块开头 ```  → 显示为内联提示
  html = html.replace(/```(\w*)?<br>([\s\S]*)$/, (_, lang, rest) => {
    const escaped = rest.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<br>/g, '\n')
    return `<div class="code-block streaming"><div class="code-bar"><span class="code-lang">CODE</span></div><pre><code>${escaped}</code></pre></div>`
  })

  // 内联代码
  html = html.replace(/`([^`]+)`/g, '<code class="il">$1</code>')

  return html + '<span class="cursor-blink">▌</span>'
}

/* ===== 播报 ===== */
function doSpeak(text: string) {
  const sdk = (window as any).__xmovSdk
  if (!sdk) return
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/[#*_~>\[\]|\\-]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!clean) return
  sdk.speak(`<speak>${clean}</speak>`, true, true)
}

/* ===== 复制 ===== */
function onCopyClick(e: Event) {
  const btn = (e.target as HTMLElement).closest('.copy-btn') as HTMLElement | null
  if (!btn) return
  const code = btn.closest('.code-block')?.querySelector('code')?.textContent ?? ''
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'COPIED'
    setTimeout(() => { btn.textContent = '复制' }, 1500)
  })
}
</script>

<style scoped>
.terminal { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; background: #0c0e12; color: #c9d1d3; position: relative; font-family: 'JetBrains Mono','Consolas','SF Mono',monospace; }

/* 扫描线 */
.scanline { position: absolute; inset: 0; pointer-events: none; z-index: 10; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px); }

/* 消息区 */
.term-body { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 12px; font-size: 11px; line-height: 1.6; }

/* 欢迎 */
.welcome { text-align: center; padding: 16px 4px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.welcome-ascii { font-size: 7px; line-height: 1.15; color: #00e5ff; white-space: pre; text-shadow: 0 0 8px rgba(0,229,255,.4); margin-bottom: 4px; }
.welcome-tag { font-size: 12px; font-weight: 700; color: #e6edf3; letter-spacing: .5px; }
.beta-badge { font-size: 8px; font-weight: 600; background: rgba(240,192,0,.15); color: #f0c000; padding: 2px 6px; border-radius: 3px; vertical-align: middle; margin-left: 4px; border: 1px solid rgba(240,192,0,.25); }
.welcome-sub { font-size: 9px; color: #5c6370; }
.quick-asks { width: 100%; display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.quick-asks button { width: 100%; text-align: left; padding: 8px 10px; background: rgba(0,229,255,.04); border: 1px solid rgba(0,229,255,.12); color: #8b949e; font-size: 11px; font-family: inherit; cursor: pointer; transition: all .15s; }
.quick-asks button:hover { background: rgba(0,229,255,.08); border-color: rgba(0,229,255,.3); color: #c9d1d3; }
.quick-asks .prompt { color: #00e5ff; }
.quick-feedback {
  width: 100%; text-align: left; padding: 8px 10px; margin-top: 4px;
  background: rgba(240,192,0,.06); border: 1px solid rgba(240,192,0,.2);
  color: #f0c000; font-size: 11px; font-family: inherit; cursor: pointer;
  transition: all .15s; display: flex; align-items: center; gap: 8px;
}
.quick-feedback:hover { background: rgba(240,192,0,.12); border-color: rgba(240,192,0,.4); color: #ffd43b; }
.quick-feedback .feedback-icon { font-size: 14px; }
.quick-feedback .feedback-arrow { margin-left: auto; opacity: 0.5; }

/* 消息 */
.msg { display: flex; flex-direction: column; gap: 3px; animation: fadeIn .2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.msg-prefix { font-size: 9px; font-weight: 600; letter-spacing: .3px; }
.user .msg-prefix { color: #00e5ff; }
.assistant .msg-prefix { color: #7ee787; }
.msg-body { word-break: break-word; padding-left: 4px; border-left: 2px solid transparent; }
.assistant .msg-body { border-left-color: rgba(126,231,135,.25); }
.user .msg-body { border-left-color: rgba(0,229,255,.25); }

.speak-btn { align-self: flex-end; background: rgba(126,231,135,.08); border: 1px solid rgba(126,231,135,.2); color: #7ee787; font-size: 9px; font-family: inherit; padding: 2px 10px; cursor: pointer; transition: all .15s; margin-top: 2px; }
.speak-btn:hover { background: rgba(126,231,135,.18); border-color: rgba(126,231,135,.4); }

/* 光标 */
.cursor-blink { display: inline; color: #7ee787; animation: blink 1s step-end infinite; }
.loading-dots { color: #8b949e; font-size: 11px; }
.dot { animation: dot-blink 1.4s infinite; }
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes dot-blink { 0%,60% { opacity: .2; } 30% { opacity: 1; } }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* 内联代码 */
:deep(.il) { background: rgba(0,229,255,.1); color: #00e5ff; padding: 1px 5px; font-size: 10px; font-family: 'JetBrains Mono','Consolas',monospace; }

/* 代码块 */
:deep(.code-block) { margin: 8px 0; border: 1px solid rgba(0,229,255,.15); overflow: hidden; box-shadow: 0 0 20px rgba(0,229,255,.05),inset 0 0 20px rgba(0,229,255,.01); }
:deep(.code-bar) { display: flex; align-items: center; justify-content: space-between; padding: 4px 10px; background: rgba(0,229,255,.06); border-bottom: 1px solid rgba(0,229,255,.1); }
:deep(.code-lang) { font-size: 8px; font-weight: 600; letter-spacing: 1px; color: rgba(0,229,255,.5); }
:deep(.copy-btn) { background: transparent; border: 1px solid rgba(0,229,255,.25); color: rgba(0,229,255,.7); font-size: 8px; font-weight: 600; letter-spacing: .5px; padding: 2px 8px; font-family: inherit; cursor: pointer; transition: all .15s; }
:deep(.copy-btn:hover) { background: rgba(0,229,255,.15); border-color: rgba(0,229,255,.5); color: #00e5ff; }
:deep(.code-block pre) { margin: 0; padding: 10px 12px; background: #080a0e; color: #c9d1d3; font-size: 10px; line-height: 1.55; overflow-x: auto; white-space: pre; font-family: 'JetBrains Mono','Consolas',monospace; }
:deep(.code-block code) { font-family: 'JetBrains Mono','Consolas',monospace; }

/* 输入行 */
.term-input { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-top: 1px solid rgba(255,255,255,.06); background: rgba(0,0,0,.2); flex-shrink: 0; }
.term-input .prompt { color: #00e5ff; font-size: 10px; font-weight: 600; flex-shrink: 0; }
.term-input input { flex: 1; background: transparent; border: none; color: #c9d1d3; font-size: 11px; font-family: inherit; padding: 4px 0; outline: none; caret-color: #00e5ff; }
.term-input input::placeholder { color: #3a3f47; }
.term-input input:disabled { opacity: .4; }
.send-btn { flex-shrink: 0; background: rgba(0,229,255,.1); border: 1px solid rgba(0,229,255,.25); color: #00e5ff; font-size: 14px; width: 30px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; transition: all .15s; }
.send-btn:hover:not(:disabled) { background: rgba(0,229,255,.2); border-color: #00e5ff; }
.send-btn:disabled { opacity: .3; cursor: not-allowed; }
.feedback-btn {
  flex-shrink: 0;
  background: rgba(240,192,0,.12);
  border: 1px solid rgba(240,192,0,.25);
  color: #f0c000; font-size: 10px; font-weight: 600;
  padding: 4px 10px; border-radius: 4px;
  cursor: pointer; font-family: inherit;
  transition: all .15s; white-space: nowrap;
}
.feedback-btn:hover { background: rgba(240,192,0,.22); border-color: rgba(240,192,0,.5); color: #ffd43b; }
.clear-btn { flex-shrink: 0; background: transparent; border: none; color: #5c6370; font-size: 9px; font-family: inherit; cursor: pointer; padding: 4px 6px; transition: color .15s; }
.clear-btn:hover { color: #8b949e; }
</style>
