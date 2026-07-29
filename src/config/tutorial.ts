export interface TutorialStep {
  title: string
  desc: string
  code: string
  lang?: string
}

export const tutorialSteps: TutorialStep[] = [
  {
    title: '初始化 SDK',
    desc: '填入 appId / appSecret / gatewayServer，点击初始化。SDK 会下载模型资源并建立连接。',
    code: `const sdk = new XmovAvatar({
  containerId: '#sdk-container',
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET',
  gatewayServer: 'YOUR_GATEWAY',
  enableLogger: true,
  env: 'production',
})

await sdk.init({ initModel: 'normal' })`,
  },
  {
    title: '配置数字人',
    desc: '选择角色、音色、背景，点击"生成配置"预览 JSON，再"应用配置"重新初始化。',
    code: `await sdk.destroy()
await sdk.init({ ...credentials, config })

// config 示例
{
  auto_ka: true,
  figure_name: 'SCF25_001',
  look_name: 'FF008_6530_new',
  mp_service_id: 'F_CN02_show52',
  sta_face_id: 'F_CN02_yuxuan',
  tts_vcn_id: 'XMOV_HN_TTS__4',
  lite_drive_style: 'lively',
  render_preset: '1080x1920_fullbody',
  frame_rate: 24,
  layout: {
    container: { size: [1440, 810] },
    avatar: { v_align: 'middle', h_align: 'center', scale: 0.3 },
  },
}`,
  },
  {
    title: '回调监听',
    desc: 'SDK 提供丰富的回调事件，可监听数字人状态、播报进度、网络质量等。在构造实例时传入回调函数即可。',
    code: `const sdk = new XmovAvatar({
  containerId: '#sdk-container',
  // ... 基础参数
  config: { /* ... */ },

  // 错误 / 警告
  onMessage(msg) {
    console.error('[SDK]', msg.code, msg.message)
  },
  onStartSessionWarning(msg) {
    console.warn('[SDK] 会话警告:', msg)
  },

  // 播报状态变化 (start / end)
  onSpeakStateChange(state, clientSpeakId) {
    console.log('播报状态:', state, 'id:', clientSpeakId)
  },

  // 行走状态变化 (walk_start / walk_end / walking)
  onWalkStateChange(status) {
    console.log('行走状态:', status)
  },

  // 身体状态（驱动状态）
  onStateChange(state) {
    console.log('身体状态:', state)
  },

  // 渲染状态 (rendering / render_end)
  onRenderChange(state) {
    console.log('渲染状态:', state)
  },

  // 在线状态 (0=在线 1=离线 2=关闭 3=可见 4=不可见)
  onStatusChange(status) {
    console.log('连接状态:', status)
  },

  // 网络信息
  onNetworkInfo(info) {
    console.log('网络 RTT:', info.rtt, 'ms 带宽:', info.downlink, 'MB/s')
  },

  // 自定义控件事件（BGM / 弹框等）
  proxyWidget: {
    playBGM(data) { console.log('播放BGM:', data) },
    showAlert(data) { console.log('弹框:', data) },
  },
})`,
  },
  {
    title: '播报文本 & 动作',
    desc: '点击 SSML 示例填充，或直接编写。支持文本播报、动作(ka)、自定义事件(uievent)。点击"执行"调用 sdk.speak()。',
    code: `// 纯文本播报
sdk.speak('<speak>你好，我是数字人。</speak>', true, true)

// 文本 + 动作（右侧指示）
sdk.speak(\`<speak>
  <ue4event>
    <type>ka</type>
    <data><action_semantic>RightSide02</action_semantic></data>
  </ue4event>
  你好！
</speak>\`, true, true)

// 自定义事件（弹框）
sdk.speak(\`<speak>
  <ue4event>
    <type>uievent</type>
    <data><name>showAlert</name></data>
  </ue4event>
  请注意弹框提示。
</speak>\`, true, true)`,
  },
  {
    title: '行走控制',
    desc: '选择目标点位（F~U 共 16 个），可附带播报文本。SDK 通过 SSML 中的 <ue4event type="walk"> 驱动数字人移动。',
    code: `// F~U 共 16 个点位，对应 x 偏移 0~1500
const ssml = \`<speak>
  <ue4event>
    <type>walk</type>
    <data><target>K</target></data>
  </ue4event>
  正在移动到点位 K
</speak>\`

sdk.speak(ssml, true, true)`,
  },
  {
    title: '打断 & 音量 & 销毁',
    desc: '打断当前动作、调节音量、页面关闭前销毁 SDK 释放资源。',
    code: `// 打断当前动作
sdk.interrupt('user')

// 设置音量（0~1）
sdk.setVolume(0.8)

// 销毁 SDK，释放资源
sdk.destroy()

// 页面关闭前清理
window.addEventListener('beforeunload', () => {
  sdk.destroy()
})`,
  },
  {
    title: '完整页面',
    desc: '一个可直接运行的 HTML 文件，复制保存为 index.html，修改 appId/appSecret/gatewayServer 即可使用。',
    lang: 'HTML',
    code: `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数字人能力展示Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; font-family: 'Microsoft YaHei', sans-serif; overflow: hidden; }
    #sdk-container { width: 100vw; height: 100vh; }
    .controls {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 10;
      display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
      background: rgba(0,0,0,.6); backdrop-filter: blur(10px);
      border-radius: 12px; padding: 10px 16px;
    }
    .controls button {
      padding: 6px 14px; font-size: 13px; font-family: inherit;
      background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15);
      color: #fff; border-radius: 6px; cursor: pointer; transition: all .15s;
    }
    .controls button:hover { background: rgba(255,255,255,.2); }
    .controls .btn-stop { background: rgba(220,60,60,.3); border-color: rgba(220,60,60,.4); color: #f99; }
    .progress-wrap {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 20;
      text-align: center; color: #fff; width: 280px;
    }
    .progress-bar {
      height: 6px; border-radius: 3px; background: rgba(255,255,255,.15);
      overflow: hidden; margin-bottom: 8px;
    }
    .progress-bar-fill {
      height: 100%; border-radius: 3px;
      background: linear-gradient(90deg, #00e5ff, #7ee787);
      transition: width .3s; width: 0%;
    }
    .progress-text { font-size: 13px; opacity: .8; }
    .progress-wrap.done .progress-bar-fill { background: #7ee787; }
  </style>
</head>
<body>
  <div id="sdk-container"></div>
  <div class="progress-wrap"><div class="progress-bar"><div class="progress-bar-fill" id="pgbar"></div></div><div class="progress-text" id="pgtxt">准备下载…</div></div>

  <div class="controls">
    <button onclick="speakText()">自我介绍</button>
    <button onclick="rightSide()">右侧指示</button>
    <button onclick="walkTo('F')">走到左边</button>
    <button onclick="walkTo('K')">走到中间</button>
    <button onclick="walkTo('U')">走到右边</button>
    <button class="btn-stop" onclick="sdk.interrupt('user')">打断</button>
  </div>

  <script src="https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar@latest.js"></script>
  <script>
    const sdk = new XmovAvatar({
      containerId: '#sdk-container',
      appId: 'YOUR_APP_ID',
      appSecret: 'YOUR_APP_SECRET',
      gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
      env: 'production',
      enableLogger: false,
      config: {
        layout: {
          container: { size: [1440, 810] },
          avatar: { v_align: 'middle', h_align: 'center', scale: 0.3, offset_x: 0, offset_y: 140 }
        },
        walk_config: {
          min_x_offset: 0, max_x_offset: 500,
          walk_points: { F:0,G:100,H:200,I:300,J:400,K:500,L:600,M:700,N:800,O:900,P:1000,Q:1100,R:1200,S:1300,T:1400,U:1500 },
          init_point: 700
        }
      },
      onSpeakStateChange(state) { console.log('播报:', state) },
      onWalkStateChange(status) { console.log('行走:', status) },
      onRenderChange(state) { console.log('渲染:', state) },
      onStatusChange(status) { console.log('状态:', status) }
    })

    async function init() {
      await sdk.init({
        initModel: 'normal',
        onDownloadProgress(p) {
          document.getElementById('pgbar').style.width = p + '%'
          document.getElementById('pgtxt').textContent = '下载中 ' + p + '%'
          if (p >= 100) {
            document.querySelector('.progress-wrap').classList.add('done')
            document.getElementById('pgtxt').textContent = '初始化完成'
            setTimeout(() => {
              document.querySelector('.progress-wrap').style.display = 'none'
            }, 800)
          }
        }
      })
      sdk.speak('<speak>你好，我是数字人。</speak>', true, true)
    }

    function speakText() {
      sdk.speak('<speak>你好，我是数字人，很高兴为您服务。</speak>', true, true)
    }

    function rightSide() {
      sdk.speak('<speak><ue4event><type>ka</type><data><action_semantic>RightSide02</action_semantic></data></ue4event>大家可以看向右上方。</speak>', true, true)
    }

    function walkTo(target) {
      sdk.speak('<speak><ue4event><type>walk</type><data><target>' + target + '</target></data></ue4event>正在移动...</speak>', true, true)
    }

    window.addEventListener('beforeunload', () => sdk.destroy())
    init()
  </script>
</body>
</html>`,
  },
]
