import { ref, onUnmounted } from 'vue'

export function useDrag(initialX = 0, initialY = 0) {
  const x = ref(initialX)
  const y = ref(initialY)
  const dragging = ref(false)
  let startX = 0
  let startY = 0

  function onPointerDown(e: PointerEvent) {
    dragging.value = true
    startX = e.clientX - x.value
    startY = e.clientY - y.value
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging.value) return
    x.value = e.clientX - startX
    y.value = e.clientY - startY
  }

  function onPointerUp() {
    dragging.value = false
  }

  onUnmounted(() => {
    dragging.value = false
  })

  return { x, y, dragging, onPointerDown, onPointerMove, onPointerUp }
}
