<template>
  <div v-if="items.length" class="widget-layer">
    <TransitionGroup name="widget-pop">
      <!-- 图片：底部居中 -->
      <div
        v-for="w in items.filter(i => i.type === 'image')"
        :key="w.id"
        class="widget-card widget-card--image"
      >
        <button class="widget-close" @click="remove(w.id)">✕</button>
        <img :src="w.image" :alt="w.title" />
        <span v-if="w.title" class="widget-label">{{ w.title }}</span>
      </div>

      <!-- 视频：顶部居中 -->
      <div
        v-for="w in items.filter(i => i.type === 'video')"
        :key="w.id"
        class="widget-card widget-card--video"
      >
        <button class="widget-close" @click="remove(w.id)">✕</button>
        <video :src="w.video" :poster="w.cover" controls autoplay />
        <span v-if="w.title" class="widget-label">{{ w.title }}</span>
      </div>

      <!-- 链接：左上角 -->
      <div
        v-for="w in items.filter(i => i.type === 'link')"
        :key="w.id"
        class="widget-card widget-card--link"
      >
        <button class="widget-close" @click="remove(w.id)">✕</button>
        <img v-if="w.image" :src="w.image" class="link-icon" />
        <div class="link-body">
          <span v-if="w.title" class="widget-label">{{ w.title }}</span>
          <span v-if="w.description" class="link-desc">{{ w.description }}</span>
        </div>
        <button class="widget-btn" @click="openLink(w.url)">打开 →</button>
      </div>

      <!-- 3D 模型：右下角 -->
      <div
        v-for="w in items.filter(i => i.type === 'model3d')"
        :key="w.id"
        class="widget-card widget-card--model"
      >
        <button class="widget-close" @click="remove(w.id)">✕</button>
        <span v-if="w.title" class="widget-label">{{ w.title }}</span>
        <button class="widget-btn" @click="openLink(w.model_url)">查看模型 →</button>
      </div>

      <!-- 文本：视频下方 -->
      <div
        v-for="w in items.filter(i => i.type === 'text')"
        :key="w.id"
        class="widget-card widget-card--text"
      >
        <button class="widget-close" @click="remove(w.id)">✕</button>
        <span v-if="w.title" class="widget-label">{{ w.title }}</span>
        <div class="text-body">{{ w.text_content }}</div>
      </div>

      <!-- 音频：左下角 -->
      <div
        v-for="w in items.filter(i => i.type === 'audio')"
        :key="w.id"
        class="widget-card widget-card--audio"
      >
        <button class="widget-close" @click="remove(w.id)">✕</button>
        <span v-if="w.title" class="widget-label">{{ w.title }}</span>
        <audio :src="w.src" controls autoplay :loop="w.loop" class="audio-player" />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useCustomWidget } from '../composables/useCustomWidget'

const { items, remove, clear } = useCustomWidget()

function openLink(url: string) {
  window.open(url, '_blank', 'noopener')
}

// 暴露 clear 给外部（切换模板时清空旧卡片）
defineExpose({ clear })
</script>

<style scoped>
.widget-layer {
  position: absolute;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}

/* ---- 通用卡片 ---- */
.widget-card {
  position: absolute;
  pointer-events: all;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.widget-close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  border: none;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.widget-close:hover {
  background: rgba(200, 40, 40, 0.7);
}

.widget-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
  padding: 0 4px;
}

.widget-btn {
  padding: 4px 12px;
  font-size: 11px;
  font-family: inherit;
  background: #1a1a1a;
  border: none;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.widget-btn:hover { opacity: 0.8; }

/* ---- 图片：左侧居中 ---- */
.widget-card--image {
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  width: 360px;
  max-height: 260px;
  padding: 6px;
  gap: 4px;
  align-items: center;
}
.widget-card--image img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  border-radius: 6px;
}

/* ---- 视频：顶部居中 ---- */
.widget-card--video {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  padding: 6px;
  gap: 4px;
  align-items: center;
}
.widget-card--video video {
  width: 100%;
  height: auto;
  max-height: 220px;
  border-radius: 6px;
}

/* ---- 链接：左上角 ---- */
.widget-card--link {
  top: 20px;
  left: 20px;
  width: 280px;
  padding: 10px 12px;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.link-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}
.link-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.link-desc {
  font-size: 11px;
  color: #666;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 3D 模型：右下角 ---- */
.widget-card--model {
  bottom: 20px;
  right: 20px;
  width: 200px;
  padding: 10px 12px;
  gap: 8px;
  align-items: center;
  text-align: center;
}

/* ---- 文本：视频下方 ---- */
.widget-card--text {
  top: 273px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  max-height: 200px;
  padding: 8px 10px;
  gap: 6px;
}
.text-body {
  font-size: 12px;
  color: #333;
  line-height: 1.55;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* ---- 音频：左下角 ---- */
.widget-card--audio {
  bottom: 20px;
  left: 20px;
  width: 260px;
  padding: 8px 10px;
  gap: 6px;
}
.audio-player {
  width: 100%;
  height: 32px;
}

/* ---- 动画 ---- */
.widget-pop-enter-active,
.widget-pop-leave-active {
  transition: all 0.25s ease;
}
.widget-pop-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}
.widget-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}
</style>
