# 技术实现手册 — 数字人能力展示 Demo

> 基于魔珐有灵（XmovAvatar）SDK 的全功能能力展示应用，集成 AI 助手、SSML 动作控制、Widget 卡片、代码游乐场

## 功能总览

| 功能 | 技术 | 说明 |
|------|------|------|
| 数字人渲染 | XmovAvatar SDK (CDN) | `xmovAvatar@latest.js`，canvas 渲染，口型同步 |
| AI 智能助手 | OpenAI SDK (兼容协议) | 流式 SSE 输出，System Prompt 注入 SDK 知识库 |
| 语音交互 | 腾讯云 ASR WebSocket | 按住录音 → 实时识别 → LLM 回复 → 数字人播报 |
| SSML 动作 | `<ue4event>` / `<uievent>` | 行走、指向、意图动作 + Widget 卡片展示 |
| 代码游乐场 | CodeMirror 6 + iframe blob | 在线编辑 HTML，实时预览 |
| 互动教程 | 分步引导 | CodeMirror 同步代码，Step by step 教学 |
| 性能监控 | Performance API + FPS 计数 | 实时帧率、驱动响应延迟、网络 RTT |
| 大屏场景 | 4 种视觉主题 | 暖色/深色/科技/商务背景 + SDK 背景切换 |
| 角色切换 | XmovAvatar 多角色 | 多角色 + 多音色 + 多背景组合 |

## 项目结构

```
lite-sdk-demo/
├── index.html              # 入口 HTML，加载 CDN SDK
├── package.json            # 依赖与脚本
├── vite.config.ts          # Vite 构建配置
├── tsconfig.json           # TypeScript 配置
├── src/
│   ├── App.vue             # 主应用
│   ├── components/
│   │   ├── RenderCanvas.vue       # 数字人画布
│   │   ├── ConfigDrawer.vue       # 右侧配置面板
│   │   ├── CredentialModal.vue    # 凭证弹窗
│   │   ├── TabPanel.vue           # DevTools 标签面板
│   │   ├── PlaygroundPanel.vue    # 代码游乐场
│   │   ├── TutorialPanel.vue      # 互动教程
│   │   ├── AiAssistant.vue        # AI 助手
│   │   ├── DemoControlBar.vue     # 底部控制栏
│   │   ├── PerformanceHUD.vue     # 性能浮窗
│   │   ├── PerformancePanel.vue   # 性能面板
│   │   ├── LogPanel.vue           # 日志面板
│   │   ├── CodePanel.vue          # API 日志面板
│   │   ├── OperationPanel.vue     # 操作面板
│   │   ├── FeedbackModal.vue      # 反馈弹窗
│   │   └── CustomWidgetOverlay.vue # Widget 覆盖层
│   ├── composables/
│   │   ├── useSDK.ts         # SDK 封装
│   │   ├── useSubtitle.ts    # 字幕管理
│   │   ├── useCustomWidget.ts # Widget 代理
│   │   ├── useAiChat.ts      # AI 对话
│   │   ├── useCodeMirror.ts  # 编辑器
│   │   ├── useLayout.ts      # 布局管理
│   │   ├── useFullscreen.ts  # 全屏控制
│   │   ├── useAutoScroll.ts  # 自动滚动
│   │   ├── useDrag.ts        # 拖拽
│   │   ├── useResize.ts      # 缩放
│   │   └── useYoulingApi.ts  # 控制台 API
│   ├── config/
│   │   ├── constants.ts      # 角色/音色/背景配置
│   │   ├── generateConfig.ts # 配置生成器
│   │   └── tutorial.ts       # 教程内容
│   ├── types/
│   │   └── index.ts          # 类型定义
│   └── utils/
│       └── walk.ts           # 行走工具函数
```

## 快速开始

```bash
npm install
npm run dev
npm run build
```

## 架构

```
用户输入（文字/语音/Widget 点选）
    ↓
ASR 识别（腾讯云）→ 文字
    ↓
LLM 流式回复 → AI 文本
    ↓
SDK.speak() 播报 + 口型同步
    ↓
onWidgetEvent → proxyWidget → Widget 卡片渲染
    ↓
onSpeakStateChange → SubtitleDisplay 字幕自渲染
```

## ASR + LLM + SDK 协作

```ts
// 1. ASR 识别
await asr.start({
  appId, secretId, secretKey,
  onResult(text, isFinal) {
    if (isFinal) handleInput(text)
  },
})

// 2. LLM 对话（流式）
async function handleInput(text: string) {
  const stream = await openai.chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: [systemPrompt, ...history, { role: 'user', content: text }],
    stream: true,
  })
  for await (const chunk of stream) {
    reply += chunk.choices[0]?.delta?.content ?? ''
  }
  sdk.speak(`<speak>${reply}</speak>`, true, true)
}
```

## SSML 动作控制

```ts
// 行走：<ue4event> 标签
sdk.speak(`<speak><ue4event><type>walk</type><data><target>K</target></data></ue4event>移动到K点</speak>`, true, true)

// Widget 卡片：<uievent> 标签
sdk.speak(`<speak><uievent><type>show_image</type><data><image>URL</image></data></uievent>请看图片</speak>`, true, true)
```

## SDK 初始化

```ts
const sdk = new XmovAvatar({
  containerId: '#sdk-container',
  appId, appSecret,
  gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
  env: 'production',
  enableClientInterrupt: true,
  proxyWidget: { /* Widget 代理回调 */ },
  onWidgetEvent: (data) => { /* 字幕 + Widget 事件 */ },
  onSpeakStateChange: (state) => { /* 说话状态 */ },
  onWalkStateChange: (status) => { /* 行走状态 */ },
})
await sdk.init({ initModel: 'normal' })
```

## 行走功能

16 个预定义点位（F~U），按环绕宽度自动计算：

```ts
const walkLabels = ['F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U']
// 通过 changeWalkConfig 设置点位映射
sdk.changeWalkConfig({
  walk_points: { F: 120, G: 220, ... },
  init_point: 1440,
})
// SSML 触发行走
sdk.speak(`<speak><ue4event><type>walk</type><data><target>K</target></data></ue4event></speak>`, true, true)
```

## 环境变量

```env
VITE_SDK_APP_ID=
VITE_SDK_APP_SECRET=
VITE_LLM_API_KEY=
VITE_LLM_ENDPOINT=https://api.deepseek.com
VITE_LLM_MODEL=deepseek-v4-pro
VITE_ASR_APP_ID=
VITE_ASR_SECRET_ID=
VITE_ASR_SECRET_KEY=
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 8 |
| 数字人 | XmovAvatar SDK (CDN) |
| LLM | OpenAI 兼容协议 |
| ASR | 腾讯云实时语音识别（WebSocket） |
| 编辑器 | CodeMirror 6 |
| 包管理 | npm |
