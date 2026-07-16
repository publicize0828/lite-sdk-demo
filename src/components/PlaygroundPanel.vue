<template>
  <div class="pg" :class="{ 'pg-h': layout === 'horizontal' }">
    <!-- 预览区 -->
    <div class="pg-preview-wrap">
      <div class="pg-preview-bar">
        <span class="pg-preview-label">预览</span>
        <button v-if="previewKey" class="pg-btn pg-btn-refresh" @click="run">↻ 刷新</button>
        <span class="pg-preview-hint" v-else>点击「▶ 运行」查看效果</span>
      </div>
      <div class="pg-preview-box">
        <iframe
          v-if="previewKey"
          :key="previewKey"
          class="pg-iframe"
          :src="iframeSrc"
          title="代码预览"
          @load="running = false"
        />
        <div v-else class="pg-preview-empty">点击运行预览你的代码</div>
      </div>
    </div>

    <!-- 代码编辑区 -->
    <div class="pg-editor-wrap">
      <div class="pg-editor-bar">
        <span class="pg-editor-label">HTML</span>
        <button class="pg-btn" @click="run">▶ 运行</button>
        <button class="pg-btn pg-btn-copy" @click="copy">📋 复制</button>
        <span v-if="running" class="pg-status">加载中…</span>
        <button class="pg-btn pg-btn-layout" @click="toggleLayout" :title="layout === 'vertical' ? '切换左右布局' : '切换上下布局'">{{ layout === 'vertical' ? '⇆' : '⇅' }}</button>
      </div>
      <div ref="editorEl" class="pg-editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { codeHighlight, codeTheme, createCodeView } from '../composables/useCodeMirror'
import { EditorState } from '@codemirror/state'
import { tutorialSteps } from '../config/tutorial'

const props = defineProps<{
  credentials: { appId: string; appSecret: string; gatewayServer: string }
}>()

function buildDefaultCode() {
  const { appId, appSecret, gatewayServer } = props.credentials
  let src = tutorialSteps[tutorialSteps.length - 1].code
  src = src.replace(/'YOUR_APP_ID'/, `'${appId}'`)
  src = src.replace(/'YOUR_APP_SECRET'/, `'${appSecret}'`)
  src = src.replace(/'https:\/\/nebula-agent\.xingyun3d\.com\/user\/v1\/ttsa\/session'/, `'${gatewayServer}'`)
  return src
}

const code = ref(buildDefaultCode())
watch(() => props.credentials, () => {
  const newCode = buildDefaultCode()
  code.value = newCode
  syncEditor(newCode)
}, { deep: true })

const previewKey = ref(0)
const iframeSrc = ref('')
const layout = ref<'vertical' | 'horizontal'>('horizontal')
function toggleLayout() { layout.value = layout.value === 'vertical' ? 'horizontal' : 'vertical' }
const running = ref(false)

let _blobUrl = ''

function run() {
  if (_blobUrl) URL.revokeObjectURL(_blobUrl)
  const blob = new Blob([code.value], { type: 'text/html' })
  _blobUrl = URL.createObjectURL(blob)
  iframeSrc.value = _blobUrl
  previewKey.value = Date.now()
  running.value = true
}

function copy() {
  navigator.clipboard.writeText(code.value)
}

// CodeMirror
const editorEl = ref<HTMLElement | null>(null)
let _view: EditorView | null = null

function setupEditor() {
  if (!editorEl.value) return
  _view?.destroy()
  _view = new EditorView({
    state: EditorState.create({
      doc: code.value,
      extensions: [
        basicSetup,
        html(),
        javascript(),
        codeHighlight,
        codeTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            code.value = update.state.doc.toString()
          }
        }),
      ],
    }),
    parent: editorEl.value,
  })
}

function syncEditor(text: string) {
  if (!_view || _view.state.doc.toString() === text) return
  _view.dispatch({
    changes: { from: 0, to: _view.state.doc.length, insert: text },
  })
}

onMounted(() => { nextTick(setupEditor) })
onUnmounted(() => {
  if (_blobUrl) URL.revokeObjectURL(_blobUrl)
  _view?.destroy()
})
</script>

<style scoped>
.pg {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  min-height: 0;
}

.pg-h { flex-direction: row; }
.pg-editor-wrap,
.pg-preview-wrap {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
}
.pg-editor-wrap { flex: 1; }
.pg-preview-wrap { flex: 1; }
.pg-h .pg-editor-wrap,
.pg-h .pg-preview-wrap { flex: 1; min-width: 200px; }

.pg-editor-bar,
.pg-preview-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.pg-editor-label,
.pg-preview-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pg-editor-label { flex: 1; }
.pg-preview-label { flex: 1; }
.pg-preview-hint {
  font-size: 9px;
  color: var(--text-muted);
}

.pg-status {
  font-size: 9px;
  color: var(--warning);
  animation: pulse-ld 1.2s ease-in-out infinite;
}
@keyframes pulse-ld {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.pg-btn {
  font-size: 10px;
  font-family: inherit;
  padding: 3px 10px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.15s;
}
.pg-btn:hover {
  background: var(--text);
  color: var(--bg-panel);
  border-color: var(--text);
}
.pg-btn-layout {
  margin-left: auto;
  opacity: .5;
  flex-shrink: 0;
}

.pg-editor {
  flex: 1;
  overflow: auto;
}
.pg-editor :deep(.cm-editor) {
  height: 100%;
}
.pg-editor :deep(.cm-scroller) {
  overflow: auto;
}

.pg-preview-box {
  flex: 1;
  background: #fafaf8;
  position: relative;
  overflow: hidden;
  min-height: 120px;
}

.pg-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.pg-preview-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
</style>
