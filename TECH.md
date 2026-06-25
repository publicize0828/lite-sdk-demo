# 技术实现手册 — 能力展示 Demo

## 功能与实现

| 功能 | 技术 | 说明 |
|------|------|------|
| 数字人渲染 | XmovAvatar SDK (CDN) | `xmovAvatar@latest.js`，canvas 渲染，口型同步 |
| AI 智能助手 | DeepSeek V4 Pro (OpenAI SDK) | 流式 SSE 输出，System Prompt 注入 SDK 知识库 |
| 语音交互 | 腾讯云 ASR Web SDK | 按住录音 → 实时识别 → LLM 回复 → 数字人播报 |
| SSML 动作 | `<ue4event>` / `<uievent>` | 行走、指向、意图动作 + Widget 卡片展示 |
| 代码游乐场 | CodeMirror 6 + iframe blob | 在线编辑 HTML，实时预览 |
| 互动教程 | 分步引导 | CodeMirror 同步代码，Step by step 教学 |

## 架构

```
用户输入（文字/语音）
    ↓
ASR 识别（腾讯云）→ 文字
    ↓
LLM 流式回复（DeepSeek V4 Pro）→ AI 文本
    ↓
SDK.speak() 播报 + 口型同步
    ↓
proxyWidget → Widget 卡片渲染
```

## ASR + LLM + SDK 协作

### 语音对话全链路

```ts
// 1. ASR 识别
await asr.start({
  appId, secretId, secretKey,
  onResult(text, isFinal) {
    if (isFinal) handleInput(text)  // → 2
  },
})

// 2. LLM 对话
async function handleInput(text: string) {
  const stream = await openai.chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: [systemPrompt, ...history, { role: 'user', content: text }],
    stream: true,
  })
  for await (const chunk of stream) {
    reply += chunk.choices[0]?.delta?.content ?? ''
  }
  sdk.speak(`<speak>${reply}</speak>`, true, true)  // → 3
}
```

### SSML 动作控制

```ts
// 行走：<ue4event> 标签
sdk.speak(`<speak><ue4event><type>walk</type><data><target>K</target></data></ue4event>移动到K点</speak>`, true, true)

// Widget 卡片：<uievent> 标签
sdk.speak(`<speak><uievent><type>show_image</type><data><image>URL</image></data></uievent>请看图片</speak>`, true, true)
```

### AI 命令控制

AI 助手的回复可包含 `<action>` 控制标签，实现"说 + 做"：

```
回复内容 <action>speak:你好</action>
回复内容 <action>walk:K</action>
回复内容 <action>template:图片展示</action>
```

前端解析 `<action>` → 调用对应的 SDK API。

## SDK 初始化

```ts
const sdk = new XmovAvatar({
  containerId: '#sdk-container',
  appId, appSecret, gatewayServer,
  config: {
    auto_ka: true,
    figure_name: 'SCF25_001',
    layout: {
      container: { size: [1440, 810] },
      avatar: { v_align: 'center', h_align: 'middle', scale: 0.3 },
    },
  },
})
await sdk.init({ initModel: 'normal' })
```

## 环境变量

```env
VITE_APP_ID=           # 魔珐星云应用 ID
VITE_APP_SECRET=       # 魔珐星云应用密钥
VITE_LLM_API_KEY=      # LLM API Key
VITE_LLM_ENDPOINT=https://api.deepseek.com
VITE_LLM_MODEL=deepseek-v4-pro
VITE_ASR_APP_ID=       # 腾讯云 APPID
VITE_ASR_SECRET_ID=    # 腾讯云 SecretId
VITE_ASR_SECRET_KEY=   # 腾讯云 SecretKey
```
