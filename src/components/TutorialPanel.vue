<template>
  <div class="tutorial">
    <div class="tut-sidebar">
      <div
        v-for="(step, i) in steps"
        :key="i"
        class="tut-step"
        :class="{ active: current === i, done: i < current }"
        @click="current = i"
      >
        <span class="tut-dot">{{ i < current ? '✓' : i + 1 }}</span>
        <span class="tut-label">{{ step.title }}</span>
      </div>
    </div>
    <div class="tut-main">
      <div class="tut-desc">{{ steps[current].desc }}</div>
      <div class="tut-code-wrap">
        <div class="tut-code-bar">
          <span class="tut-code-lang">{{ steps[current].lang || 'JS' }}</span>
          <button class="tut-copy-btn" @click="copyCode(steps[current].code)">复制</button>
        </div>
        <div ref="editorEl" class="tut-code" />
      </div>
      <div class="tut-nav">
        <button class="btn-line" :disabled="current === 0" @click="current--">← 上一步</button>
        <span class="tut-progress">{{ current + 1 }} / {{ steps.length }}</span>
        <button class="btn-fill" :disabled="current === steps.length - 1" @click="current++">下一步 →</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, shallowRef } from 'vue'
import { tutorialSteps, type TutorialStep } from '../config/tutorial'
import { createCodeView } from '../composables/useCodeMirror'
import type { EditorView } from '@codemirror/view'

const steps: TutorialStep[] = tutorialSteps
const current = ref(0)
const editorEl = ref<HTMLElement | null>(null)
const _view = shallowRef<EditorView | null>(null)

function copyCode(code: string) {
  navigator.clipboard.writeText(code)
}

function rebuildEditor() {
  if (!editorEl.value) return
  _view.value?.destroy()
  const step = steps[current.value]
  const lang = step.lang === 'HTML' ? 'html' : 'js'
  _view.value = createCodeView(editorEl.value, step.code, lang, true)
}

watch(current, () => { nextTick(rebuildEditor) })
onMounted(() => { nextTick(rebuildEditor) })
onUnmounted(() => { _view.value?.destroy() })
</script>

<style scoped>
.tutorial {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
  min-height: 0;
}
.tut-sidebar {
  width: 110px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}
.tut-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-muted);
  transition: all 0.15s;
}
.tut-step:hover { color: var(--text); }
.tut-step.active { color: var(--text); font-weight: 600; background: var(--bg); }
.tut-step.done { color: var(--success); }
.tut-dot {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--border);
  color: var(--text-secondary);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.tut-step.active .tut-dot { background: var(--text); color: var(--bg-panel); }
.tut-step.done .tut-dot { background: var(--success); color: #fff; }
.tut-label { flex: 1; line-height: 1.3; }
.tut-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  padding: 8px;
}
.tut-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.tut-code-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
}
.tut-code-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tut-code-lang {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}
.tut-copy-btn {
  font-size: 10px;
  font-family: inherit;
  padding: 2px 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.15s;
}
.tut-copy-btn:hover {
  background: var(--text);
  color: var(--bg-panel);
  border-color: var(--text);
}
.tut-code {
  flex: 1;
  overflow: auto;
}
.tut-code :deep(.cm-editor) {
  height: 100%;
}
.tut-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  flex-shrink: 0;
}
.tut-progress {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
</style>
