# 数字人能力展示 Demo — 项目详解

> 本文档详细介绍 lite-sdk-demo 的项目结构、架构设计、组件实现和数据流。

---

## 一、项目目录结构

```
lite-sdk-demo/
├── index.html                 # Vite 入口，引入 SDK CDN
├── package.json               # 项目依赖 + 脚本
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
├── env.d.ts                   # 类型声明
├── .env                       # 环境变量（本地开发用，不提交 git）
│
└── src/
    ├── main.ts                # Vue 应用入口
    ├── App.vue                # 根组件（核心编排）
    │
    ├── components/            # 组件
    │   ├── RenderCanvas.vue       # 数字人渲染画布
    │   ├── CredentialModal.vue    # 凭证输入弹窗
    │   ├── ConfigDrawer.vue       # 右侧配置面板
    │   ├── DemoControlBar.vue     # 底部控制栏
    │   ├── TabPanel.vue           # DevTools 标签页容器
    │   ├── AiAssistant.vue        # AI 对话助手
    │   ├── PlaygroundPanel.vue    # 代码演练场（CodeMirror）
    │   ├── OperationPanel.vue     # 手动 API 调用面板
    │   ├── TutorialPanel.vue      # 互动教学
    │   ├── FaqPanel.vue           # 常见问题（FAQ）
    │   ├── LogPanel.vue           # 运行日志
    │   ├── CodePanel.vue          # SDK API 调用记录
    │   ├── PerformanceHUD.vue     # 实时性能浮窗
    │   ├── PerformancePanel.vue   # 性能详情面板
    │   ├── CustomWidgetOverlay.vue # Widget 卡片渲染层
    │   └── FeedbackModal.vue      # 用户反馈弹窗
    │
    ├── composables/           # 组合式函数（核心逻辑）
    │   ├── useSDK.ts              # SDK 生命周期 + 实例管理
    │   ├── useLayout.ts           # 布局 + 行走配置生成
    │   ├── useCustomWidget.ts     # Widget 数据代理
    │   ├── useAiChat.ts           # AI 流式对话
    │   ├── useSubtitle.ts         # 字幕显隐控制
    │   ├── useDrag.ts             # DevTools 拖拽
    │   ├── useResize.ts           # DevTools 缩放
    │   ├── useFullscreen.ts       # 全屏控制
    │   ├── useAutoScroll.ts       # 日志自动滚动
    │   ├── useCodeMirror.ts       # CodeMirror 编辑器封装
    │   └── useYoulingApi.ts       # window.__youlingUi API
    │
    ├── config/                # 配置文件
    │   ├── constants.ts           # 角色/音色/背景/驱动风格映射
    │   ├── generateConfig.ts      # SDK init 配置生成器
    │   ├── sdk-knowledge.ts       # AI 助手的 SDK 知识库
    │   ├── tutorial.ts            # 教程步骤定义
    │   └── templates.ts           # SSML/代码模板
    │
    ├── utils/
    │   └── walk.ts                # 行走点位生成 + SSML 工具
    │
    └── types/
        └── index.ts               # TypeScript 类型定义
```

---

## 二、架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.vue（根容器）                         │
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │   RenderCanvas.vue    │  │       DevTools 浮动面板          │  │
│  │   #sdk-container      │  │  AI助手/演练场/教学/操作/        │  │
│  │   数字人渲染区域       │  │  API调用日志/性能/FAQ/日志       │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
│  ┌──────────────────────┐                                         │
│  │  CustomWidgetOverlay  │  ┌──────────────────────────────────┐  │
│  │  Widget 卡片渲染层     │  │       ConfigDrawer（右侧抽屉）      │  │
│  └──────────────────────┘  │   角色/音色/背景/凭证/布局/字幕       │  │
│  ┌──────────────────────┐  └──────────────────────────────────┘  │
│  │   DemoControlBar      │                                         │
│  │   底部控制栏           │  ┌──────────────────────────────────┐  │
│  │   说话/动作/行走/Widget│  │    PerformanceHUD（性能浮窗）      │  │
│  └──────────────────────┘  │    FPS / 延迟 / 打断耗时           │  │
│                            └──────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  CredentialModal（凭证弹窗）                   │ │
│  │                    邀请码 + APP ID/SECRET + 试用计时           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**三层架构**：

```
视图层（Components）    ← 用户交互、UI 渲染
    ↕ (provide/inject, props, emit)
逻辑层（Composables）   ← 状态管理、业务逻辑、SDK 封装
    ↕ (window.XmovAvatar)
SDK 层（CDN）           ← 3D 渲染、TTS、口型、动作、行走
```

---

## 三、核心组件详解

### 3.1 App.vue — 根组件

整个应用的容器，职责：

- **组装所有子组件**：画布、控制栏、DevTools、配置面板、凭证弹窗
- **管理全局状态**：SDK 初始化状态、凭证、主题
- **协调 SDK 生命周期**：调用 `useSDK`、`useLayout`、`useCustomWidget`
- **处理窗口事件**：resize → 重算行走点位、beforeunload → 销毁 SDK

关键代码结构：

```vue
<script setup>
// 1. 组合式函数
const { initSDK, executeSsml, destroy, isInitialized, ... } = useSDK('#sdk-container', logger)
const { screenLayout, defaultLayout } = useLayout(bgTheme)
const { proxyWidget, clear: clearWidgets } = useCustomWidget()

// 2. 凭证管理 + 试用计时
const credentials = reactive({ appId, appSecret, gatewayServer })
const showCredModal = ref(true)  // 无凭证时弹出

// 3. 初始化
async function onInit() {
  const config = sdkWidgets.bgVisible ? defaultLayout(bg) : screenLayout()
  await initSDK({ ...credentials, config })
}

// 4. 背景切换 → 重新计算布局+行走点位
watch(() => sdkWidgets.bgVisible, (v) => {
  const wc = buildWalkConfig(cw)
  sdk.changeWalkConfig(wc)
  sdk.changeLayout({ ... })
})

// 5. 窗口 resize → 重算点位
window.addEventListener('resize', onResize)
</script>
```

### 3.2 RenderCanvas.vue — 渲染画布

最简单的组件，只负责提供一个 `<div id="sdk-container">` 给 SDK 渲染。

```vue
<template>
  <div :id="containerId" class="sdk-canvas">
    <!-- 加载中 -->
    <div v-if="!initialized" class="loading">
      <p>数字人加载中 {{ progress }}%</p>
    </div>
  </div>
</template>
```

SDK 接管这个 div 后，内部创建 canvas 元素进行 3D 渲染。

### 3.3 CredentialModal.vue — 凭证弹窗

凭证配置弹窗，核心是 `APP ID` / `APP SECRET` 表单 + "连接数字人"按钮，通过 `emit('connect', appId, appSecret)` 把凭证交给 `App.vue` 发起初始化。纯展示组件，自身不持有业务状态。

- **props**：`visible` / `connecting` / `error` / `trialExpired` / `trialSeconds`（试用相关状态由 `App.vue` 计算后传入，组件不自己管理）
- **emit**：`connect`（提交凭证）、`close`（关闭）
- 无凭证时由 `App.vue` 控制弹出；试用倒计时、localStorage 持久化等逻辑都在 `App.vue`，不在本组件

### 3.4 DemoControlBar.vue — 底部控制栏

功能最丰富的交互入口。

**布局**：

```
┌──────────────────────────────────────────────────────────┐
│ [🎤按住说话]  [文字输入框________________] [发送] [🏃行走] │
│ [🎬动作] [🖼️Widget] [⚙️设置]                              │
└──────────────────────────────────────────────────────────┘
```

**操作按钮与对应 SSML**（下方 SSML 为示例格式，具体点位/动作以运行时生成为准）：

| 按钮 | 触发的 SSML |
|-|-|
| 🏃 行走到左侧 | 走到第一个点位 `F`（`<ue4event><type>walk</type><data><target>F</target></data></ue4event>`） |
| 🏃 行走到右侧 | 走到最后一个点位（点位数量随容器宽度变化，非固定标签） |
| 🎬 动作（欢迎/开心/思考/同意…） | `<ue4event>` 关键动作（ka / ka_intent） |
| 🖼️ 图片 | `<uievent><type>show_image</type><data>...</data></uievent>` |
| 🖼️ 视频 | `<uievent><type>show_video</type><data>...</data></uievent>` |

### 3.5 ConfigDrawer.vue — 配置面板

右侧抽屉，所有 SDK 配置集中管理：

```
┌──────────────────────┐
│       配置面板        │
├──────────────────────┤
│ 角色：  [下拉选择]     │ → characterMap
│ 音色：  [下拉选择]     │ → voiceMap（联动角色）
│ 背景：  [下拉选择]     │ → bgMap
│ 驱动风格：[下拉选择]   │ → driveStyleMap（联动角色）
│ 布局：  [开关]        │ → SDK 背景 / 大屏布局
│ 字幕：  [开关]        │ → subtitleVisible
│ 音量：  [滑块 0-100]  │ → sdk.setVolume()
│                      │
│ SDK APP ID：  [输入]  │
│ SDK SECRET：  [输入]  │
│ LLM API Key：[输入]   │
│ LLM Endpoint：[输入]  │
│                      │
│ [初始化] [销毁]        │
└──────────────────────┘
```

点"应用配置"：`destroy() → 等待 1s → initSDK(新配置)`

### 3.6 TabPanel.vue — DevTools 面板

浮动 DevTools 的多标签容器，支持拖拽和缩放。三连击画面可切换 AI 助手标签的显隐。

**标签页**（共 8 个）：

| 标签 | 组件 | 功能 |
|-|-|-|
| AI助手 | `AiAssistant.vue` | 流式对话 + SDK 命令 |
| 演练场 | `PlaygroundPanel.vue` | 在线 HTML 编辑器 |
| 教学 | `TutorialPanel.vue` | 分步互动教程 |
| 操作 | `OperationPanel.vue` | 手动 SSML/API 调用 |
| API调用日志 | `CodePanel.vue` | SDK 调用记录 |
| 性能 | `PerformancePanel.vue` | 性能详情 |
| FAQ | `FaqPanel.vue` | 常见问题 |
| 日志 | `LogPanel.vue` | 运行日志 |

### 3.7 CustomWidgetOverlay.vue — Widget 渲染层

监听 `useCustomWidget().items`，实时渲染 Widget 卡片。

**渲染策略**：

```
items: ref<WidgetItem[]>
    ↓ watch
按 type 分发：
  image   → <img> 标签
  video   → <video> 标签
  link    → <a> 卡片（标题+描述+缩略图）
  model3d → 3D 模型查看器（同一时刻只保留一个）
  text    → 文本气泡
  audio   → <audio> 标签（自动播放/循环/音量）
```

每种 Widget 附带关闭按钮，点击 `remove(id)` 从列表移除。

### 3.8 PerformanceHUD.vue — 性能浮窗

固定在画面角落的实时性能数据：

```
┌──────────────────────┐
│ FPS:  60             │
│ 驱动: 120ms          │
│ RTT:  45ms           │
│ 打断: 8ms            │
│ 状态: 在线           │
└──────────────────────┘
```

每秒更新一次，数据来自 `useSDK().performanceStats`。

---

## 四、Composables 详解

### 4.1 useSDK.ts — 核心大脑

最复杂的 composable（~480 行），封装完整的 SDK 生命周期。

**对外暴露**：

```ts
const {
  // 状态
  sdkInstance, isInitialized, isInitializing, downloadProgress,
  subtitleText, currentSpeakState, currentWalkState, currentStatus,
  lastInitError, sessionAlert, performanceStats,

  // 方法
  initSDK,          // async (options) => boolean
  executeSsml,      // (ssml) => void，自动打断+校验+日志+性能统计
  interrupt,        // () => void
  setVolume,        // (vol: 0-100) => void
  offline, online,  // 下线 / 上线
  flushSpeakQueue,  // 冲刷播报队列
  waitForOnline,    // (timeout=10s) => Promise<boolean>
  destroy,          // () => void，按 interrupt → offline → destroy 顺序
} = useSDK('#container-id', logger)
```

**内部状态机**：

```
未初始化 → 初始化中 → 已就绪 → 已销毁
                ↓ 超时 30s
              失败
```

**executeSsml 执行链路**（6 步）：

1. **存在性校验**：`sdk && isInitialized`
2. **打断检测**：`voiceState === 'start'` → `interrupt + idle`
3. **类型识别**：正则匹配 SSML → 分类（walk / ka / uievent / 纯说话）
4. **点位校验**：walk 类 → target 是否在 walkLabels 中
5. **性能计时**：记录 `sendSpeakTime`（用于计算驱动响应延迟）
6. **执行**：`sdk.speak(ssml, true, true)`

**性能统计**：通过回调实时更新 `performanceStats`：

```ts
// FPS — onFPSUpdate + rAF
performanceStats.fps = stats.current

// 驱动响应 — onVoiceStateChange('start', duration)
// 或 fallback: Date.now() - sendSpeakTime
performanceStats.driveResponseTime = duration

// 打断延迟 — sdk.interrupt() 返回值
performanceStats.interruptLatency = latency

// 网络 RTT — onNetworkInfo
performanceStats.networkRtt = info.rtt

// 首帧 — onStateRenderChange
performanceStats.renderDuration = duration
```

### 4.2 useLayout.ts — 布局管理器

**职责**：根据当前主题和显示模式，生成 SDK 需要的 `layout` + `walk_config`。

**两种布局模式**：

```ts
// 主题模式（sdk 背景不可见时）
function screenLayout() {
  const ly = themeLayout[bgTheme.value] || themeLayout.white  // { cw, ch, scale }
  const wc = buildWalkConfig(ly.cw)
  return {
    layout: { container: { size: [ly.cw, ly.ch] }, avatar: { scale: ly.scale, ... } },
    walk_config: wc,
  }
}

// 全屏模式（sdk 背景可见时）
function defaultLayout(bg) {
  const cw = bg?.cw ?? window.innerWidth
  const ch = bg?.ch ?? window.innerHeight
  const wc = buildWalkConfig(cw)
  return {
    layout: { container: { size: [cw, ch] }, avatar: { scale: bg?.scale ?? 0.3, ... } },
    walk_config: wc,
  }
}
```

**5 种主题**（`scale` 由背景图高度 `ch*2/3/1920` 计算，white 固定 0.3）：

| 主题 | 容器 | 缩放 | 来源 |
|-|-|-|-|
| white | 1440×810 | 0.30 | 无背景图 |
| warm | 1272×717 | 0.25 | bg-warm.jpg |
| dark | 1341×383 | 0.13 | bg-dark.jpg |
| tech | 1611×450 | 0.16 | bg-tech.jpg |
| image | 1080×599 | 0.21 | bg.jpg |

### 4.3 useCustomWidget.ts — Widget 代理

**职责**：接收 SDK 的 `proxyWidget` 回调，维护 Widget 列表供 `CustomWidgetOverlay` 渲染。模块级单例 store，多个调用方（SDK 回调 push、Overlay 渲染、App.vue clear）共享同一份列表。

**7 个 proxyWidget 方法**：

```ts
const proxyWidget = {
  show_image(data)   → push({ type: 'image',   image, title })
  show_video(data)   → push({ type: 'video',   video, cover, title })
  show_link(data)    → push({ type: 'link',    url, title, description, image })
  show_model3d(data) → push({ type: 'model3d', model_url, title })  // 只保留最新一个
  show_text(data)    → push({ type: 'text',    title, text_content })
  widget_text(data)  → push({ type: 'text',    title: '弹框提示', text_content })  // 弹框变体
  bgm_start(data)    → push({ type: 'audio',   src, title, loop, volume })
}
```

对应 6 种 Widget 类型：`image` / `video` / `link` / `model3d` / `text` / `audio`。

**数据访问路径**：SDK 传给 proxyWidget 的 raw data 结构为 `{ data: { image, title } }`，所以 handler 中通过 `data?.data?.image` 取值。

### 4.4 useAiChat.ts — AI 对话

**职责**：管理 AI 助手的流式对话。

```ts
const {
  send,          // (text: string) => Promise<void> —— 发送消息
  reply,         // Ref<string> —— 流式回复（逐字更新）
  isStreaming,   // Ref<boolean> —— 是否正在接收
  history,       // Ref<Message[]> —— 对话历史
} = useAiChat()
```

**流式对话实现**：

```ts
const stream = await openai.chat.completions.create({
  model: 'deepseek-v4-pro',
  messages: [systemPrompt, ...history.value, { role: 'user', content: text }],
  stream: true,
})
for await (const chunk of stream) {
  reply.value += chunk.choices[0]?.delta?.content ?? ''
}
```

AI 回复中的 `<action>` 标签会被前端解析并调用对应的 SDK API。

---

## 五、行走系统

### 5.1 点位生成算法

位于 `src/utils/walk.ts`。

```ts
const WALK_MARGIN  = 120   // 首个点位距左边缘
const WALK_SPACING = 120   // 点位间距

function buildWalkConfig(containerWidth: number) {
  const count = Math.max(1, Math.floor((containerWidth - 240) / 120) + 1)
  // 标签从 F 开始：前 21 个用单字母 F~Z，超过后用双字母 AA、AB…
  // 坐标从 120 开始，间距 120；init_point 取中间点位
  for (let i = 0; i < count; i++) {
    walk_points[walkLabel(i)] = 120 + i * 120
  }
  return { walk_points, init_point, min_x_offset, max_x_offset, labels }
}
```

**示例**：1440px 容器 → 11 个点位 (F~P)，坐标 120 到 1320。

> ⚠️ 标签从 `F` 起是因为 SDK 内部预留了 `A~E`。SDK 侧文档标注实际可用点位约为 `F~U`（16 个），而本算法在超宽容器下会继续生成 `V~Z` 乃至双字母点位——落到 SDK 可用范围外的点位可能不生效，超宽布局需注意。

### 5.2 动态行走方向

`getWalkStepsTarget(labels, steps)` 根据当前位置和剩余空间自动选择方向：

- 右侧点位更多 → 向右走
- 左侧点位更多 → 向左走
- 两侧相等 → 与上次方向相反（首次默认向右）
- 双向越界 → 走到最近边缘

### 5.3 布局切换 → 点位重算

任何导致容器宽度变化的操作都会触发点位重算：

```ts
// 背景切换
watch(sdkWidgets.bgVisible, () => {
  const wc = buildWalkConfig(newWidth)
  sdk.changeWalkConfig(wc)
})

// 窗口 resize
window.addEventListener('resize', () => {
  const wc = buildWalkConfig(window.innerWidth)
  sdk.changeWalkConfig(wc)
})
```

---

## 六、全局调试 API

SDK 初始化完成后，以下变量挂载到 `window`：

```javascript
// 浏览器控制台可直接使用
window.__xmovSdk           // SDK 实例
window.__sdkInitialized    // boolean
window.__youlingUi         // UI 控制 API
```

**控制台快速测试**：

```javascript
// 播报
__xmovSdk.speak('<speak>你好</speak>', true, true)

// 行走
const ssml = '<speak><ue4event><type>walk</type><data><target>K</target></data></ue4event>走到中间</speak>'
__xmovSdk.speak(ssml, true, true)

// Widget 图片
const ssml2 = '<speak><uievent><type>show_image</type><data><image>https://picsum.photos/400</image><title>测试图</title></data></uievent>看图片</speak>'
__xmovSdk.speak(ssml2, true, true)

// 打断 + 音量
__xmovSdk.interrupt('user')
__xmovSdk.setVolume(0.5)
```

---

## 七、环境变量

```env
# 必填（魔珐星云 SDK）
VITE_APP_ID=              # 魔珐星云应用 ID（注册后获取）
VITE_APP_SECRET=          # 魔珐星云应用密钥

# 可选（AI 助手功能）
VITE_LLM_API_KEY=         # LLM API Key
VITE_LLM_ENDPOINT=        # LLM 接口地址（默认 DeepSeek）
VITE_LLM_MODEL=           # LLM 模型（默认 deepseek-v4-pro）
```
