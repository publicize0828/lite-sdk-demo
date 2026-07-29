import { ref } from 'vue'

export function useResize(initial = 320, min = 260, max = 600) {
  const width = ref(initial)
  const resizing = ref(false)
  let startX = 0
  let startW = 0

  function onDown(e: PointerEvent) {
    resizing.value = true
    startX = e.clientX
    startW = width.value
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onMove(e: PointerEvent) {
    if (!resizing.value) return
    const delta = startX - e.clientX
    width.value = Math.min(max, Math.max(min, startW + delta))
  }

  function onUp() {
    resizing.value = false
  }

  return { width, resizing, onDown, onMove, onUp }
}
