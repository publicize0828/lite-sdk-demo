import { computed, type Ref } from 'vue'
import { buildWalkConfig, walkLabels } from '../utils/walk'
import bgWarm from '../assets/bg-warm.jpg'
import bgDark from '../assets/bg-dark.jpg'
import bgTech from '../assets/bg-tech.jpg'
import bgImage from '../assets/bg.jpg'

// 背景主题 → 容器+数字人布局
// 容器=背景图尺寸, avatar右下角, 高度=背景图高*2/3
export const themeLayout: Record<string, { cw: number; ch: number; scale: number }> = {
  white: { cw: 1440, ch: 810,  scale: 0.3 },
  warm:  { cw: 1272, ch: 717,  scale: +(717*2/3 / 1920).toFixed(2) },
  dark:  { cw: 1341, ch: 383,  scale: +(383*2/3 / 1920).toFixed(2) },
  tech:  { cw: 1611, ch: 450,  scale: +(450*2/3 / 1920).toFixed(2) },
  image: { cw: 1080, ch: 599,  scale: +(599*2/3 / 1920).toFixed(2) },
}

const themeBgMap: Record<string, string> = { warm: bgWarm, dark: bgDark, tech: bgTech, image: bgImage }

export function useLayout(bgTheme: Ref<string>) {
  function screenLayout() {
    const ly = themeLayout[bgTheme.value] || themeLayout.white
    const wc = buildWalkConfig(ly.cw)
    walkLabels.value = wc.labels
    return {
      layout: {
        container: { size: [ly.cw, ly.ch] },
        avatar: { v_align: 'bottom', h_align: 'right', scale: ly.scale, offset_x: 0, offset_y: 0 },
      },
      walk_config: wc,
    }
  }

  function defaultLayout(bg?: { scale?: number; offsetY?: number; cw?: number; ch?: number }) {
    const cw = bg?.cw ?? window.innerWidth
    const ch = bg?.ch ?? window.innerHeight
    const wc = buildWalkConfig(cw)
    walkLabels.value = wc.labels
    return {
      layout: {
        container: { size: [cw, ch] },
        avatar: { v_align: 'bottom', h_align: 'right', scale: bg?.scale ?? 0.3, offset_x: 0, offset_y: bg?.offsetY ?? 0 },
      },
      walk_config: wc,
    }
  }

  const themeBgUrl = computed(() => themeBgMap[bgTheme.value] || '')

  return { screenLayout, defaultLayout, themeBgUrl }
}
