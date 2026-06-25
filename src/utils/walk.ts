import { ref } from 'vue'

// ========== 常量 ==========
const WALK_MARGIN = 120
const WALK_SPACING = 120

// ========== 响应式状态 ==========
// 注意：模块级 ref 单例，仅适用于 SPA 场景。SSR/测试需改为 provide/inject。
export const walkLabels = ref<string[]>([])

/** 最后一次行走的目标点位标签，用于"边说边行走"计算偏移 */
export const lastWalkTarget = ref<string | null>(null)
/** 上一次行走方向：1=右，-1=左，0=初始/居中 */
let _lastDirection = 0

// ========== 标签工具 ==========

function walkLabel(index: number): string {
  if (index < 21) return String.fromCharCode(70 + index)
  const i = index - 21
  return String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26))
}

// ========== 配置生成 ==========

export function buildWalkConfig(cw: number) {
  const count = Math.max(1, Math.floor((cw - WALK_MARGIN * 2) / WALK_SPACING) + 1)
  const pts: Record<string, number> = {}
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    const label = walkLabel(i)
    pts[label] = WALK_MARGIN + i * WALK_SPACING
    labels.push(label)
  }
  const centerIdx = Math.floor(labels.length / 2)
  const centerLabel = labels[centerIdx]
  return {
    min_x_offset: WALK_MARGIN,
    max_x_offset: cw - WALK_MARGIN,
    walk_points: pts,
    init_point: pts[centerLabel],
    labels,
  }
}

export interface WalkPreset { label: string; ssml: string; tooltip?: string; desc?: string }

export function buildWalkPresets(labels: string[]): WalkPreset[] {
  if (!labels.length) return []
  const first = labels[0]
  const last = labels[labels.length - 1]
  return [
    { label: '行走到左侧', ssml: makeWalkSsml(first) },
    { label: '行走到右侧', ssml: makeWalkSsml(last) },
  ]
}

// ========== 动态行走 ==========

/** 从上次位置偏移 steps 步，优先走向剩余点位多的一侧，相等时反向，越界则反向，双向越界走边缘 */
export function getWalkStepsTarget(labels: string[], steps: number): string | null {
  if (!labels.length) return null
  const current = lastWalkTarget.value
  let idx = current ? labels.indexOf(current) : -1
  if (idx === -1) { idx = Math.floor(labels.length / 2); _lastDirection = 0 }
  const rightRemain = labels.length - 1 - idx
  const leftRemain = idx
  // 剩余多的优先；相等则走与上次相反的方向；首次默认右
  let goRight: boolean
  if (rightRemain > leftRemain) goRight = true
  else if (leftRemain > rightRemain) goRight = false
  else goRight = _lastDirection <= 0  // 相等时：上次往左或首次 → 往右；上次往右 → 往左

  const trials = goRight ? [idx + steps, idx - steps] : [idx - steps, idx + steps]
  for (const t of trials) {
    if (t >= 0 && t < labels.length) {
      _lastDirection = t > idx ? 1 : -1
      return labels[t]
    }
  }
  // 双向都越界，走到最近边缘
  const edge = trials[0] > idx ? labels.length - 1 : 0
  _lastDirection = edge > idx ? 1 : -1
  return labels[edge]
}

// ========== SSML 工具 ==========

/** 生成行走 SSML（含播报，用左右方向描述） */
function makeWalkSsml(target: string): string {
  const labels = walkLabels.value
  const idx = labels.indexOf(target)
  const mid = Math.floor(labels.length / 2)
  const direction = idx < 0 ? '' : idx <= mid ? '左侧' : '右侧'
  return `<speak>正在向${direction}移动\n  <ue4event>\n    <type>walk</type>\n    <data>\n      <target>${target}</target>\n    </data>\n  </ue4event>\n</speak>`
}

/** 生成边走边说的 SSML */
export function makeWalkSpeakSsml(target: string): string {
  return `<speak>\n  真的特别感谢大家抽时间来这里。现在，我将向前移动至指挥观察位。\n  <ue4event>\n    <type>walk</type>\n    <data>\n      <target>${target}</target>\n    </data>\n  </ue4event>\n  下面我将演示数字人的基础交互能力，包括语音合成、口唇同步、面部表情与肢体动作。让我们携手推进信创产品在军事领域的深度应用，为科技强军贡献力量。\n</speak>`
}
