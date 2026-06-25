<template>
  <div class="cfg-root">
  <div class="config-drawer" :class="{ collapsed: !visible }" :style="{ width: width + 'px' }">
    <div class="drawer-resize-handle" @pointerdown="onResizeDown" @pointermove="onResizeMove" @pointerup="onResizeUp"></div>

    <div class="drawer-inner">
      <div class="drawer-header">
        <span>配置面板</span>
        <button class="drawer-toggle" @click="$emit('update:visible', false)">×</button>
      </div>

      <div class="drawer-body">
        <!-- 凭证：本地 → 直接输入；魔搭/预览 → 弹窗引导 -->
        <div class="cfg-section">
          <h4>应用凭证</h4>
          <template v-if="isModelScope">
            <button class="btn-fill btn-cred-modal" @click="openCredModal">
              ✨ 连接数字人
            </button>
          </template>
          <template v-else>
            <label>appId</label>
            <input :value="credentials.appId" type="text" @input="$emit('update:credentials', { ...credentials, appId: ($event.target as HTMLInputElement).value })" />
            <label>appSecret</label>
            <input :value="credentials.appSecret" type="password" @input="$emit('update:credentials', { ...credentials, appSecret: ($event.target as HTMLInputElement).value })" />
            <details class="cfg-help">
              <summary>如何获取 APP ID 和 Secret？</summary>
              <p>登录 <a href="https://xingyun3d.com/?utm_campaign=&utm_source=modelscope&utm_medium=&utm_term=&utm_content=" target="_blank">魔珐星云官网</a>，注册并登录账号。</p>
              <p>邀请码：<b class="invite-code" @click="copyInvite">JMVAYB4RB2</b><span v-if="copied" class="copied-hint"> 已复制</span>（注册时填入可获 1000 积分）</p>
              <p>在「应用管理」中创建新的横屏应用，复制页面右上角的 APP ID 和 APP SECRET。</p>
            </details>
            <button class="btn-fill" :disabled="!credentials.appId || initializing" @click="$emit('init')">
              {{ initializing ? '初始化中...' : '初始化' }}
            </button>
          </template>
        </div>

        <!-- 基本设置 -->
        <div class="cfg-section">
          <h4>基本设置</h4>
          <div class="cfg-row">
            <span>音量 {{ volume }}</span>
            <input type="range" min="0" max="100" :value="volume" class="slider" @input="$emit('update:volume', Number(($event.target as HTMLInputElement).value))" />
          </div>
          <div class="cfg-row">
            <span>字幕</span>
            <button class="btn-sm" :class="{ active: subtitle }" @click="$emit('update:subtitle', !subtitle)">{{ subtitle ? 'ON' : 'OFF' }}</button>
          </div>
          <div class="cfg-row">
            <span>大屏场景</span>
            <select :value="bgTheme" :disabled="walking || initializing" :title="walking ? '数字人正在行走，请等待行走结束后再切换场景' : initializing ? '数字人正在初始化，请等待初始化完成后再切换场景' : ''" @change="$emit('update:bgTheme', ($event.target as HTMLSelectElement).value)">
              <option value="warm">暖色大屏</option>
              <option value="dark">深色大屏</option>
              <option value="tech">科技大屏</option>
              <option value="image">商务背景</option>
            </select>
          </div>
          <div class="cfg-hint">※ SDK背景关闭时启用大屏场景</div>
          <div class="cfg-row">
            <span>SDK 背景</span>
            <button class="btn-sm" :class="{ active: sdkBgVisible }" :disabled="walking || initializing" :title="walking ? '数字人正在行走，请等待行走结束后再切换' : initializing ? '数字人正在初始化，请等待初始化完成后再切换' : ''" @click="$emit('update:sdkBgVisible', !sdkBgVisible)">{{ sdkBgVisible ? 'ON' : 'OFF' }}</button>
          </div>
        </div>

        <!-- DevTools 开关 -->
        <button class="btn-fill devtools-btn" @click="$emit('toggleDevtools')">
          {{ devToolsVisible ? '隐藏 DevTools' : '打开 DevTools' }}
        </button>
      </div>
    </div>
  </div>

  <button v-if="!visible" class="drawer-open-btn" @click="$emit('update:visible', true)">☰</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useResize } from '../composables/useResize'

defineProps<{
  credentials: { appId: string; appSecret: string; gatewayServer: string }
  initializing: boolean
  volume: number
  subtitle: boolean
  sdkBgVisible: boolean
  visible: boolean
  bgTheme: string
  devToolsVisible: boolean
  walking: boolean
  isModelScope: boolean
}>()

defineEmits<{
  init: []
  'update:credentials': [v: { appId: string; appSecret: string; gatewayServer: string }]
  'update:volume': [v: number]
  'update:subtitle': [v: boolean]
  'update:sdkBgVisible': [v: boolean]
  'update:visible': [v: boolean]
  'update:bgTheme': [v: string]
  toggleDevtools: []
}>()

const copied = ref(false)
function openCredModal() {
  const ui = (window as any).__youlingUi
  if (ui?.showCredModal) ui.showCredModal()
}
function copyInvite() {
  navigator.clipboard.writeText('JMVAYB4RB2')
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const { width, onDown: onResizeDown, onMove: onResizeMove, onUp: onResizeUp } = useResize(320, 240, 560)
</script>

<style scoped>
.config-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  z-index: 20;
  background: var(--bg-panel);
  border-left: 1.5px solid var(--border);
  display: flex; flex-direction: column;
  box-shadow: -4px 0 20px rgba(0,0,0,.08);
  transform: translateX(0); transition: transform .25s, width .15s;
}
.config-drawer.collapsed { transform: translateX(100%); pointer-events: none; }
.drawer-resize-handle {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 5px; cursor: col-resize; z-index: 21;
}
.drawer-resize-handle:hover { background: rgba(0,0,0,.06); }
.drawer-inner { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid var(--border);
  font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.drawer-toggle { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); padding: 0 4px; line-height: 1; box-shadow: none; }
.drawer-toggle:hover { color: var(--text); }
.drawer-body { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 12px; }
.cfg-section { display: flex; flex-direction: column; gap: 3px; }
.cfg-section h4 { font-size: 10px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px dashed var(--border); margin-bottom: 4px; }
.cfg-row { display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 2px 0; }
.cfg-row .slider { flex: 1; margin: 0 8px; }
.devtools-btn { margin-top: 8px; font-size: 10px; padding: 4px 8px; width: auto; }
.cfg-hint { font-size: 9px; color: var(--text-muted); font-style: italic; }
.cfg-help { font-size: 10px; color: var(--text-secondary); line-height: 1.6; border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; margin-top: 8px; }
.cfg-help summary { cursor: pointer; font-weight: 600; }
.cfg-help p { margin-top: 3px; }
.cfg-help a { color: #3b82f6; }
.invite-code { background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; cursor: pointer; user-select: all; }
.invite-code:hover { background: #dbeafe; }
.copied-hint { color: #34c759; }
.drawer-open-btn {
  position: fixed; top: 50%; right: 0; transform: translateY(-50%);
  z-index: 19; width: 28px; height: 56px;
  background: var(--bg-panel); border: 1.5px solid var(--border); border-right: none;
  border-radius: var(--radius) 0 0 var(--radius);
  font-size: 16px; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;
  box-shadow: -2px 2px 8px rgba(0,0,0,.06);
}
</style>
