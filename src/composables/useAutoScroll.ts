import { watch, ref, nextTick } from 'vue'

export function useAutoScroll(source: () => { id: number }[]) {
  const container = ref<HTMLElement | null>(null)

  watch(
    () => source().length,
    async () => {
      await nextTick()
      if (container.value) {
        container.value.scrollTop = container.value.scrollHeight
      }
    },
  )

  return { container }
}
