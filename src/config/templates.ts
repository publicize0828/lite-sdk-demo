export interface SsmlTemplate {
  name: string
  ssml: string
}

export const widgetTemplates: SsmlTemplate[] = [
  {
    name: '图片展示',
    ssml: `<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png</image>
      <title>办公室场景</title>
    </data>
  </uievent>
  这是我们的办公室场景图片。
</speak>`
  },
  {
    name: '视频播放',
    ssml: `<speak>
  <uievent>
    <type>show_video</type>
    <data>
      <video>https://media.xingyun3d.com/xingyun3d/general/official_website/xingyun_open_v2/f7b110-37e2a1-c6d05a.mp4</video>
      <cover>https://example.com/cover.jpg</cover>
      <title>产品介绍视频</title>
    </data>
  </uievent>
  让我为您播放产品介绍视频。
</speak>`
  },
  {
    name: '网站链接',
    ssml: `<speak>
  <uievent>
    <type>show_link</type>
    <data>
      <url>https://xingyun3d.com/?utm_campaign=github&utm_source=shequ&utm_medium=&utm_term=&utm_content=</url>
      <title>官方网站</title>
      <description>访问我们的官方网站了解更多信息</description>
      <image>https://xingyun3d.com/favicon.ico</image>
    </data>
  </uievent>
  您可以访问我们的官方网站了解更多详情。
</speak>`
  },
  {
    name: '文本卡片',
    ssml: `<speak>
  <uievent>
    <type>show_text</type>
    <data>
      <title>重要提示</title>
      <text_content>这是一段重要的文本内容，可以用于展示FAQ、说明文档等。</text_content>
    </data>
  </uievent>
  让我为您展示重要信息。
</speak>`
  },
  {
    name: '多模态组合',
    ssml: `<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png</image>
      <title>场景图片</title>
    </data>
  </uievent>
  首先展示场景图片。
  <uievent>
    <type>show_video</type>
    <data>
      <video>https://media.xingyun3d.com/xingyun3d/general/official_website/xingyun_open_v2/f7b110-37e2a1-c6d05a.mp4</video>
      <cover>https://example.com/cover.jpg</cover>
      <title>产品介绍视频</title>
    </data>
  </uievent>
  让我为您播放产品介绍视频。
  <uievent>
    <type>show_link</type>
    <data>
      <url>https://www.example.com</url>
      <title>相关链接</title>
    </data>
  </uievent>
  然后提供相关链接。
  <uievent>
    <type>show_model3d</type>
    <data>
      <model_url>https://example.com/model.glb</model_url>
      <title>产品3D模型</title>
    </data>
  </uievent>
  这是产品的3D模型展示。
</speak>`
  },
  {
    name: '背景音乐',
    ssml: `<speak>
  <uievent>
    <type>bgm_start</type>
    <data>
      <src>https://xmov-youyan.oss-cn-hangzhou.aliyuncs.com/3447857974.mp3</src>
      <title>背景音乐</title>
      <bgm_loop>true</bgm_loop>
      <bgm_volume>0.8</bgm_volume>
    </data>
  </uievent>
  为你播放背景音乐。
</speak>`
  },
]
