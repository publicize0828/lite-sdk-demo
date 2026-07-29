import { ref } from 'vue'

export interface ImageWidget {
  id: number
  type: 'image'
  image: string
  title?: string
}

export interface VideoWidget {
  id: number
  type: 'video'
  video: string
  title?: string
  cover?: string
}

export interface LinkWidget {
  id: number
  type: 'link'
  url: string
  title?: string
  description?: string
  image?: string
}

export interface Model3dWidget {
  id: number
  type: 'model3d'
  model_url: string
  title?: string
}

export interface TextWidget {
  id: number
  type: 'text'
  title?: string
  text_content: string
}

export interface AudioWidget {
  id: number
  type: 'audio'
  src: string
  title?: string
  loop?: boolean
  volume?: number
}

export type WidgetItem =
  | ImageWidget
  | VideoWidget
  | LinkWidget
  | Model3dWidget
  | TextWidget
  | AudioWidget

type WidgetInput = Omit<ImageWidget, 'id'> | Omit<VideoWidget, 'id'> | Omit<LinkWidget, 'id'> | Omit<Model3dWidget, 'id'> | Omit<TextWidget, 'id'>

// 单例 store（多个调用方共享同一份 widget 列表：SDK 回调 push、CustomWidgetOverlay 渲染、App.vue clear）
let _store: ReturnType<typeof _createStore> | null = null

function _createStore(logWidgetEvent?: (code: string) => void) {
  const items = ref<WidgetItem[]>([])
  let _nextId = 1

  function push(w: any) {
    const item = { ...w, id: _nextId++ } as WidgetItem
    if (item.type === 'model3d') {
      items.value = items.value.filter((i) => i.type !== 'model3d')
    }
    items.value = [...items.value, item]
  }

  function remove(id: number) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clear() {
    items.value.length = 0
  }

  function log(name: string, data: any) {
    logWidgetEvent?.(`// SDK proxyWidget.${name}: ${JSON.stringify(data)}`)
  }

  const proxyWidget = {
    show_image(data: any) {
      log('show_image', data)
      push({ type: 'image', image: data?.data?.image ?? '', title: data?.data?.title ?? '' })
    },
    show_video(data: any) {
      log('show_video', data)
      push({ type: 'video', video: data?.data?.video ?? '', title: data?.data?.title ?? '', cover: data?.data?.cover ?? '' })
    },
    show_link(data: any) {
      log('show_link', data)
      push({ type: 'link', url: data?.data?.url ?? '', title: data?.data?.title ?? '', description: data?.data?.description ?? '', image: data?.data?.image ?? '' })
    },
    show_model3d(data: any) {
      log('show_model3d', data)
      push({ type: 'model3d', model_url: data?.data?.model_url ?? '', title: data?.data?.title ?? '' })
    },
    show_text(data: any) {
      log('show_text', data)
      push({ type: 'text', title: data?.data?.title ?? '', text_content: data?.data?.text_content ?? '' })
    },
    widget_text(data: any) {
      log('widget_text', data)
      push({ type: 'text', title: '弹框提示', text_content: data?.data?.text_content ?? data?.text_content ?? '' })
    },
    bgm_start(data: any) {
      log('bgm_start', data)
      const d = data?.data ?? data
      push({
        type: 'audio',
        src: d?.src ?? d?.audio ?? d?.url ?? '',
        title: d?.title ?? '背景音乐',
        loop: d?.bgm_loop === 'true' || d?.loop === true,
        volume: Number(d?.bgm_volume ?? d?.volume ?? 1),
      })
    },
  }

  return { items, push, remove, clear, proxyWidget }
}

export function useCustomWidget(logWidgetEvent?: (code: string) => void) {
  if (!_store) _store = _createStore(logWidgetEvent)
  return _store
}
