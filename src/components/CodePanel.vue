<template>
  <div class="panel">
    <div class="log-header">
      <h3 class="panel-title">/ API /</h3>
      <div class="log-tools">
        <button class="btn-sm" @click="copy">复制</button>
      </div>
    </div>
    <div ref="editorEl" class="code-cm" />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref, shallowRef, nextTick } from 'vue'
import type { CodeSnippetEntry } from '../composables/useSDK'
import { createCodeView, updateCodeView } from '../composables/useCodeMirror'
import type { EditorView } from '@codemirror/view'

const props = defineProps<{
  codeSnippets: CodeSnippetEntry[]
}>()

const editorEl = ref<HTMLElement | null>(null)
const _view = shallowRef<EditorView | null>(null)

function refresh() {
  if (!editorEl.value) return
  const text = props.codeSnippets.map(e => `// [${e.time}] ${e.code}`).join('\n') || '// waiting for api calls...'
  if (_view.value) {
    updateCodeView(_view.value, text)
  } else {
    _view.value = createCodeView(editorEl.value, text, 'js', true)
  }
}

watch(() => props.codeSnippets.length, () => { nextTick(refresh) })
onMounted(() => { nextTick(refresh) })
onUnmounted(() => { _view.value?.destroy() })

function copy() {
  navigator.clipboard.writeText(props.codeSnippets.map(e => e.code).join('\n'))
}
</script>

<style scoped>
.code-cm {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.code-cm :deep(.cm-editor) {
  height: 100%;
}
.log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.log-header .panel-title { margin-bottom: 0; }
.log-tools { display: flex; gap: 4px; }
</style>
