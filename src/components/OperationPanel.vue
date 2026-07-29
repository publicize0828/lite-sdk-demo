<template>
  <div class="op-panel">
    <!-- 行走控制 -->
    <div class="op-section">
      <h3 class="op-title">行走控制</h3>
      <div class="walk-grid">
        <button v-for="pt in quickWalkPoints" :key="pt.label" class="walk-btn" @click="walkTo(pt.label)">{{ pt.desc }} ({{ pt.label }})</button>
      </div>
      <div class="walk-speak-row">
        <input v-model="speakText" type="text" placeholder="伴随文本..." @keyup.enter="walkTo(currentPos)" />
        <button class="btn-fill" @click="walkTo(currentPos)" :disabled="walking">行走</button>
      </div>
    </div>

    <!-- SSML 播报 -->
    <div class="op-section op-section--grow">
      <h3 class="op-title">播报 & 动作 & 事件</h3>

      <span class="op-subtitle">关键动作</span>
      <div class="example-grid">
        <button v-for="(item, idx) in kaExamples" :key="'k'+idx" class="btn-example" :title="item.desc || item.label" @click="ssml = item.ssml">{{ item.label }}</button>
      </div>

      <span class="op-subtitle">行走</span>
      <div class="example-grid">
        <button v-for="(item, idx) in walkExamples" :key="'w'+idx" class="btn-example" :title="item.desc || item.label" @click="ssml = item.ssml">{{ item.label }}</button>
      </div>

      <span class="op-subtitle">停顿 & 注音</span>
      <div class="example-grid">
        <button v-for="(item, idx) in breakExamples" :key="'br'+idx" class="btn-example" :title="item.label" @click="ssml = item.ssml">{{ item.label }}</button>
      </div>

      <span class="op-subtitle">自定义事件</span>
      <div class="example-grid">
        <button v-for="(item, idx) in customExamples" :key="'c'+idx" class="btn-example" :title="item.label" @click="ssml = item.ssml">{{ item.label }}</button>
      </div>

      <!-- 场景测试：离线 / 在线切换 -->
      <span class="op-subtitle">场景测试</span>
      <div class="example-grid">
        <button class="btn-scenario offline" @click="sdk?.offline()">离线</button>
        <button class="btn-scenario online" @click="goOnline">在线</button>
      </div>

      <textarea v-model="ssml" class="ssml-area" placeholder="// 点击上方示例填充…" />
      <div class="btn-row">
        <button class="btn-fill" :disabled="!ssml" @click="speak(ssml)">执行</button>
        <button class="btn-danger" @click="stop">打断</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, watch, computed } from 'vue'
import type { SsmlExample } from '../types'
import { widgetTemplates } from '../config/templates'
import { walkLabels, buildWalkPresets, getWalkStepsTarget, makeWalkSpeakSsml } from '../utils/walk'
import { SdkKey } from '../types'

const props = defineProps<{
  credentials: { appId: string; appSecret: string; gatewayServer: string }
}>()

const sdk = inject(SdkKey)!

const walkPoints = ref<string[]>(walkLabels.value)
const walkExamples = ref<SsmlExample[]>([])
const currentPos = ref(walkLabels.value.length ? walkLabels.value[Math.floor(walkLabels.value.length / 2)] : '')
const speakText = ref('')
const walking = ref(false)
const ssml = ref('')

const WALK_STEPS = 4

// 行走控制：仅展示最左、中间、最右 3 个点位
const quickWalkPoints = computed(() => {
  const all = walkPoints.value
  if (!all.length) return []
  const first = all[0]
  const last = all[all.length - 1]
  const mid = all[Math.floor(all.length / 2)]
  return [
    { label: first, desc: '最左侧' },
    { label: mid, desc: '中心' },
    { label: last, desc: '最右侧' },
  ]
})

function updateWalkExamples(labels: string[]) {
  const presets = buildWalkPresets(labels)
  const target = getWalkStepsTarget(labels, WALK_STEPS)
  if (target) {
    presets.push({ label: '边说边行走', ssml: makeWalkSpeakSsml(target) })
  }
  walkExamples.value = presets
}

watch(walkLabels, (labels) => {
  if (!labels.length) return
  walkPoints.value = labels
  updateWalkExamples(labels)
  currentPos.value = labels[Math.floor(labels.length / 2)]
}, { immediate: true })

const kaExamples: SsmlExample[] = [
  { label: '播报+右侧指示(高)【speak+KA】', desc: '右侧指示(高)：右手高举指向右上方 (action_semantic: RightSide02)', ssml: '<speak>\n  真的特别感谢大家抽时间来这里。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>RightSide02</action_semantic>\n    </data>\n  </ue4event>\n  顺便大家可以看向右上方。下面，我将演示数字人的基础交互能力，包括语音合成、口唇同步、面部表情与肢体动作。让我们携手推进信创产品在军事领域的深度应用，为科技强军贡献力量。\n</speak>' },
  { label: '播报+提升+抓重点【speak+KA】', desc: '提升+抓重点：先提升右手→再抓重点手势 (Elevate + KeyPoints)', ssml: '<speak>\n  在信息安全培训中，我们要牢记几个原则。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>Elevate</action_semantic>\n    </data>\n  </ue4event>\n  首先提升思想认识，克服麻痹心理，时刻保持清醒头脑。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>KeyPoints</action_semantic>\n    </data>\n  </ue4event>\n  其次要抓住重点环节，内网隔离、访问控制、加密传输。\n</speak>' },
  { label: '播报+指屏幕【speak+KA intent】', desc: '指向屏幕意图：手指向屏幕方向 (ka_intent: Pointscreen)', ssml: '<speak>\n  真的特别感谢大家抽时间来这里。\n  <ue4event>\n    <type>ka_intent</type>\n    <data>\n      <ka_intent>Pointscreen</ka_intent>\n    </data>\n  </ue4event>\n  顺便大家可以看向我的手指方向,继续下面的内容。谢谢大家~\n</speak>' },
  { label: '播报+左侧指示+指屏幕【KA+KA intent】', desc: '左侧指示(KA) + 指屏幕(KA intent)：双动作组合', ssml: '<speak>\n  真的特别感谢大家抽时间来这里。\n  <ue4event>\n    <type>ka</type>\n    <data>\n      <action_semantic>LeftSide</action_semantic>\n    </data>\n  </ue4event>\n  大家可以看向左边。下面我将演示数字人的基础交互能力，包括语音合成、口唇同步、面部表情与肢体动作。让我们携手推进信创产品在军事领域的深度应用，为科技强军贡献力量。最后大家可以看向我的手指方向,\n  <ue4event>\n    <type>ka_intent</type>\n    <data>\n      <ka_intent>Pointscreen</ka_intent>\n    </data>\n  </ue4event>\n  继续下面的内容。谢谢大家~\n</speak>' },
]

const breakExamples: SsmlExample[] = [
  { label: '播报+停顿【speak+break】', ssml: '<speak>大家好<break time="500ms"/>真的特别感谢大家抽时间来这里</speak>' },
  { label: '播报+注音【speak+phoneme】', ssml: '<speak>\n  让每一块屏幕、每个应用、每一个终端\n  <phoneme py="ei1 ai1">AI</phoneme>\n  从"有大脑"升级到"有身体"，像真人一样自然表达和交互。\n</speak>' },
]

const customExamples: SsmlExample[] = [
  ...widgetTemplates.map((t) => ({ label: `[${t.name}]`, ssml: t.ssml })),
]

function walkTo(pt: string) {
  if (!sdk?.executeSsml) return
  currentPos.value = pt
  const text = speakText.value ? speakText.value : `正在移动到${pt}点位`
  sdk.executeSsml(`<speak>${text}<ue4event><type>walk</type><data><target>${pt}</target></data></ue4event></speak>`)
}

function speak(ssmlText: string) { sdk?.executeSsml(ssmlText) }
function stop() { sdk?.interrupt() }

function goOnline() {
  sdk?.online()
}
</script>

<style scoped>
.op-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 4px 0; overflow: hidden; min-height: 0; }
.op-section { display: flex; flex-direction: column; gap: 4px; }
.op-section--grow { flex: 1; overflow: hidden; min-height: 0; }
.op-title { font-size: 10px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px dashed var(--border); margin-bottom: 2px; flex-shrink: 0; }
.op-subtitle { font-size: 9px; font-weight: 600; color: var(--text-muted); padding: 2px 4px; background: var(--bg); border-radius: 2px; flex-shrink: 0; }
.ssml-area { flex: 1; min-height: 40px; }
.btn-scenario { padding: 4px 10px; color: #fff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
.btn-scenario:hover { opacity: .8; }
.btn-scenario.offline { background: #ef4444; }
.btn-scenario.online { background: #10b981; color: #fff; }
</style>
