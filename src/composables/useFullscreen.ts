import { ref, onMounted, onUnmounted } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(false)
  const pendingFullscreen = ref(false)

  function enterFullscreen() {
    isFullscreen.value = true
    pendingFullscreen.value = true
  }

  function doBrowserFullscreen() {
    isFullscreen.value = true
    pendingFullscreen.value = false
    if (document.fullscreenEnabled) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  function activateFullscreen() {
    if (document.fullscreenEnabled) {
      document.documentElement.requestFullscreen()
        .then(() => { pendingFullscreen.value = false })
        .catch(() => {})
    }
  }

  function exitFullscreen() {
    isFullscreen.value = false
    pendingFullscreen.value = false
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || isFullscreen.value) exitFullscreen()
    else enterFullscreen()
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement) {
      isFullscreen.value = false
      pendingFullscreen.value = false
    }
  }

  onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onUnmounted(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

  return {
    isFullscreen,
    pendingFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    doBrowserFullscreen,
    activateFullscreen,
  }
}
