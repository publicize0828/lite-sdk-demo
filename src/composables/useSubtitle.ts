import { ref, watchEffect, onUnmounted } from 'vue'

// SDK 内部背景和字幕控件共用同一个 class，背景控件下有 img 标签，字幕没有
// SDK 会实时重建 DOM，所以用 MutationObserver + !important 确保生效

export function useSdkWidgets() {
  const bgVisible = ref(true)
  const subtitleVisible = ref(true)
  let _observer: MutationObserver | null = null

  function applyOne(el: HTMLElement) {
    const hasImg = el.querySelector('img') !== null
    if (hasImg) {
      el.style.setProperty('display', bgVisible.value ? '' : 'none', bgVisible.value ? '' : 'important')
    } else {
      el.style.setProperty('display', subtitleVisible.value ? '' : 'none', subtitleVisible.value ? '' : 'important')
    }
  }

  function applyAll() {
    document.querySelectorAll<HTMLElement>('.avatar-sdk-widget-container').forEach(applyOne)
  }

  // 监听 DOM 变化，SDK 实时创建新控件时立即应用
  _observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('avatar-sdk-widget-container')) {
            applyOne(node)
          } else {
            node.querySelectorAll<HTMLElement>('.avatar-sdk-widget-container').forEach(applyOne)
          }
        }
      }
    }
  })
  _observer.observe(document.body, { childList: true, subtree: true })

  watchEffect(() => {
    bgVisible.value
    subtitleVisible.value
    applyAll()
  })

  onUnmounted(() => { _observer?.disconnect() })

  return {
    bgVisible,
    subtitleVisible,
    showBg: () => { bgVisible.value = true },
    hideBg: () => { bgVisible.value = false },
    showSubtitle: () => { subtitleVisible.value = true },
    hideSubtitle: () => { subtitleVisible.value = false },
  }
}
