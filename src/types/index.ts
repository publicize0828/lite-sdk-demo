// ========== SDK 全局类型声明 ==========

export interface SDKMessage {
  code: number
  message: string
  timestamp: number
  originalError?: string
}

export interface SDKNetworkInfo {
  rtt: number
  downlink: number
}

export enum SDKStatus {
  online = 0,
  offline = 1,
  close = 2,
  visible = 3,
  invisible = 4,
}

export interface LayoutConfig {
  container: {
    size: [number, number]
  }
  avatar: {
    v_align: 'left' | 'right' | 'center'
    h_align: 'top' | 'bottom' | 'middle'
    scale: number
    offset_x: number
    offset_y: number
  }
}

export interface WalkConfig {
  min_x_offset: number
  max_x_offset: number
  walk_points: Record<string, number>
  init_point: number
}

export interface AvatarConfig {
  layout: LayoutConfig
  walk_config: WalkConfig
}

export interface SDKOptions {
  containerId: string
  appId: string
  appSecret: string
  gatewayServer: string
  tag?: string
  headers?: Record<string, string>
  cacheServer?: string
  env?: 'production' | 'develop'
  config?: AvatarConfig
  hardwareAcceleration?: 'default' | 'prefer-hardware' | 'prefer-software'
  enableClientInterrupt?: boolean
  enableLogger?: boolean
  enableDebugger?: boolean
  onMessage?: (message: SDKMessage) => void
  onStartSessionWarning?: (message: object) => void
  onAAFrameHandle?: (data: object) => void
  onNetworkInfo?: (info: SDKNetworkInfo) => void
  onWidgetEvent?: (data: any) => void
  proxyWidget?: Record<string, (data: any) => void>
  onStateChange?: (state: string) => void
  onStateRenderChange?: (state: string, duration: number) => void
  onSpeakStateChange?: (state: string, client_speak_id: string) => void
  onRenderChange?: (state: string) => void
  onVoiceStateChange?: (state: string, duration?: number) => void
  onStatusChange?: (status: SDKStatus) => void
  onWalkStateChange?: (status: string) => void
}

export interface XmovAvatarInstance {
  init(params: {
    initModel?: 'normal' | 'invisible'
    onDownloadProgress?: (progress: number) => void
  }): Promise<void>
  idle(): void
  speak(ssml: string, is_start: boolean, is_end: boolean, extra?: { client_speak_id?: string }): string
  listen(): void
  think(): void
  interactiveidle(): void
  setVolume(volume: number): void
  destroy(): void
  showDebugInfo(): void
  hideDebugInfo(): void
  offlineMode(): void
  onlineMode(): void
  switchInvisibleMode(): void
  changeAvatarVisible(visible: boolean): void
  interrupt(type: string): void
  changeLayout(layout: LayoutConfig): void
  changeWalkConfig(walkConfig: WalkConfig): void
}

declare global {
  interface Window {
    XmovAvatar: new (options: SDKOptions) => XmovAvatarInstance
  }
}

export {}

// ========== 依赖注入 ==========

import type { InjectionKey } from 'vue'

export interface SdkApi {
  executeSsml: (ssml: string) => void
  interrupt: () => void
  setVolume: (vol: number) => void
  offline: () => void
  online: () => void
  flushSpeakQueue: () => void
  waitForOnline: (timeout?: number) => Promise<boolean>
  destroy: () => void
  initSDK: (options: { appId: string; appSecret: string; config?: any }) => Promise<boolean>
}

export const SdkKey: InjectionKey<SdkApi> = Symbol('sdk')

// ========== 业务类型 ==========

export interface LogEntry {
  id: number
  time: string
  type: string
  message: string
}

/** 预设 SSML 示例 */
export interface SsmlExample {
  label: string
  ssml: string
  desc?: string
}
