import type { Ref } from 'vue'
import type { useSdkWidgets } from './useSubtitle'
import { characterVoices, bgMap, driveStyleMap } from '../config/constants'

export interface YoulingApiDeps {
  showConfigDrawer: Ref<boolean>
  showFloating: Ref<boolean>
  sdkWidgets: ReturnType<typeof useSdkWidgets>
  bgTheme: Ref<string>
  volume: Ref<number>
  poweredOff: Ref<boolean>
  addCodeSnippet: (code: string) => void
  clearWidgets: () => void
  offline: () => void
  destroy: () => void
  character: Ref<string>
  voice: Ref<string>
  background: Ref<string>
  driveStyle: Ref<string>
  onInit: () => Promise<void>
  applyConfig: () => Promise<void>
  devW: Ref<number>
  devH: Ref<number>
  fullscreen: {
    enterFullscreen: () => void
    exitFullscreen: () => void
    toggleFullscreen: () => void
    doBrowserFullscreen: () => void
    activateFullscreen: () => void
  }
  changeBgLayout: (key: string) => void
  logApi: (code: string) => void
}

export function useYoulingApi(deps: YoulingApiDeps) {
  const DEV_MIN_W = 640
  const DEV_MIN_H = 570

  function setCharacter(v: string) {
    const { character, voice } = deps
    if (character.value === v) {
      const voices = characterVoices[v]
      if (voices?.length) {
        const other = voices.filter(x => x !== voice.value)
        voice.value = other.length ? other[Math.floor(Math.random() * other.length)] : voices[0]
      }
    } else {
      character.value = v
      voice.value = ''
    }
    if (!voice.value) {
      const voices = characterVoices[v]
      if (voices?.length) voice.value = voices[Math.floor(Math.random() * voices.length)]
    }
    const bgKeys = Object.keys(bgMap)
    const curBg = deps.background.value
    if (bgKeys.length > 1) {
      const other = bgKeys.filter(x => x !== curBg)
      deps.background.value = other[Math.floor(Math.random() * other.length)]
    } else {
      deps.background.value = bgKeys[0]
    }
    const styles = driveStyleMap[v]
    if (styles?.length) {
      const other = styles.filter(x => x.value !== deps.driveStyle.value)
      deps.driveStyle.value = other.length ? other[Math.floor(Math.random() * other.length)].value : styles[0].value
    }
    deps.applyConfig()
  }

  return {
    showPanel: () => { deps.showConfigDrawer.value = true },
    hidePanel: () => { deps.showConfigDrawer.value = false },
    showDevTools: () => { deps.showFloating.value = true },
    hideDevTools: () => { deps.showFloating.value = false },
    subtitleOn: () => { deps.sdkWidgets.showSubtitle() },
    subtitleOff: () => { deps.sdkWidgets.hideSubtitle() },
    bgOn: () => { deps.sdkWidgets.showBg() },
    bgOff: () => { deps.sdkWidgets.hideBg() },
    setBg: (name: string) => { deps.bgTheme.value = name },
    setVolume: (v: number) => { deps.volume.value = v },
    initSdk: () => deps.onInit(),
    logApi: (code: string) => deps.addCodeSnippet(code),
    isScreenMode: !deps.sdkWidgets.bgVisible.value,
    powerOff: () => { deps.poweredOff.value = true },
    powerOn: () => { deps.poweredOff.value = false },
    offline: () => { deps.offline() },
    disconnect: () => { deps.destroy() },
    clearWidgets: () => deps.clearWidgets(),
    setCharacter,
    setVoice: (v: string) => { deps.voice.value = v; deps.applyConfig() },
    setSdkBg: (v: string) => { deps.background.value = v; deps.applyConfig() },
    setStyle: (v: string) => { deps.driveStyle.value = v; deps.applyConfig() },
    applyConfig: () => deps.applyConfig(),
    changeBgLayout: (key: string) => deps.changeBgLayout(key),
    setDevSize: (w: number, h: number) => { deps.devW.value = Math.max(DEV_MIN_W, w); deps.devH.value = Math.max(DEV_MIN_H, h) },
    getDevSize: () => ({ w: deps.devW.value, h: deps.devH.value }),
    isSpeaking: false,
    enterFullscreen: () => deps.fullscreen.enterFullscreen(),
    exitFullscreen: () => deps.fullscreen.exitFullscreen(),
    toggleFullscreen: () => deps.fullscreen.toggleFullscreen(),
    doBrowserFullscreen: () => deps.fullscreen.doBrowserFullscreen(),
    activateFullscreen: () => deps.fullscreen.activateFullscreen(),
  }
}
