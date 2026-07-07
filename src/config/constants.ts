// ========== 角色/音色/背景 配置映射表 ==========

const BG_CDN = 'https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D'

export const characterMap: Record<string, {
  label: string
  figure_name: string
  look_name: string
  mp_service_id: string
  render_preset: string
  sta_face_id: string
  lite_drive_style: string
  optional_emotion: string
  enable_text_times_event?: boolean
  anchor_image: string
  anchor_height: number
  anchor_width: number
  anchor_x: number
  anchor_y: number
}> = {
  heer: {
    label: '数字人-女性角色',
    figure_name: 'SCF25_001',
    look_name: 'N_Wuliping_14329_new',
    mp_service_id: 'F_CN02_show52',
    render_preset: '1080x1920_fullbody',
    sta_face_id: 'F_CN06_liuyicen',
    lite_drive_style: 'lively',
    optional_emotion: 'serious,smile,confused',
    anchor_image: 'https://media.xingyun3d.com/avatar_sdk_material/F_CN02_show52__1080x1920_fullbody__AF026_10335_new.png',
    anchor_height: 0.929392446633826,
    anchor_width: 0.929392446633826,
    anchor_x: 0.3527239150507849,
    anchor_y: 0.031198686371100164,
  },
  jinlv: {
    label: '数字人-男性角色',
    figure_name: 'SCM20_001',
    look_name: 'zhize_V2_15211_new',
    mp_service_id: 'M_CN03_show03',
    render_preset: '1080x1920_fullbody',
    sta_face_id: 'M_CN06_maxuze',
    lite_drive_style: 'lively',
    optional_emotion: 'confused,smile,serious',
    enable_text_times_event: true,
    anchor_image: 'https://media.xingyun3d.com/avatar_sdk_material/M_CN03_show03__1080x1920_fullbody__FM019_9349_new.png',
    anchor_height: 0.9704433497536946,
    anchor_width: 0.967930029154519,
    anchor_x: 0.3465804066543438,
    anchor_y: 0,
  },
}

export const voiceMap: Record<string, { label: string; tts_vcn_id: string }> = {
  graceful_anchor:     { label: '优雅主播',       tts_vcn_id: 'XMOV_LV_TTS__13' },
  professional_female: { label: '专业女声',       tts_vcn_id: 'XMOV_HN_TTS__8' },
  elegant_host:       { label: '大气主持',       tts_vcn_id: 'XMOV_HN_TTS__21' },
  humble_elder:       { label: '谦和长者',       tts_vcn_id: 'XMOV_HN_TTS__36' },
  elegant_male:       { label: '优雅男声',       tts_vcn_id: 'XMOV_EN_TTS__6' },
  steady_blogger:     { label: '沉稳博主',       tts_vcn_id: 'XMOV_EN_TTS__15' },
}

// 角色 → 音色联动
export const characterVoices: Record<string, string[]> = {
  heer:   ['graceful_anchor', 'professional_female', 'elegant_host'],
  jinlv:  ['humble_elder', 'elegant_male', 'steady_blogger'],
}

// 驱动风格
export const driveStyleMap: Record<string, { label: string; value: string }[]> = {
  heer:   [
    { label: '活泼', value: 'lively' },
    { label: '严肃', value: 'serious' },
    { label: '解说', value: 'service1' },
    { label: '通用', value: 'general' },
  ],
  jinlv:   [
    { label: '活泼', value: 'lively' },
    { label: '严肃', value: 'serious' },
    { label: '通用', value: 'general' },
  ],
}

export const bgMap: Record<string, { label: string; url: string; scale?: number; offsetY?: number; cw?: number; ch?: number }> = {
  transparent:      { label: '透明背景-全身', url: '',  scale: 0.3, offsetY: 0 },
  streamline:       { label: '艺术陈列区B',          url: `${BG_CDN}/jushen_v1_ArtDisplay_02.png`, scale: 0.3, offsetY: 140 },
  eco_architectural:{ label: '绿意石景墙景',         url: `${BG_CDN}/jushen_v1_eco_architectural_lobby_background_01.png`, scale: 0.3, offsetY: 140 },
  industrial:       { label: '简约圆桌交流区B',       url: `${BG_CDN}/jushen_v1_IndustrialStyleSeminarRoom_02.png`, scale: 0.3, offsetY: 140 },
}
