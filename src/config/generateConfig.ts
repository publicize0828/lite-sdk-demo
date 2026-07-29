import { characterMap, voiceMap, bgMap, characterVoices } from './constants'

export function generateConfig(params: {
  character: string
  voice: string
  background: string
  driveStyle: string
  defaultLayout: (bg?: { scale?: number; offsetY?: number; cw?: number; ch?: number }) => { layout: any; walk_config: any }
  screenLayout: () => { layout: any; walk_config: any }
  isSdkBgVisible: boolean
}) {
  const { character, voice, background, driveStyle, defaultLayout, screenLayout, isSdkBgVisible } = params
  const char = characterMap[character] ?? characterMap.jinlv
  const defaultVoiceKey = characterVoices[character]?.[0] || 'humble_elder'
  const vcfg = voiceMap[voice] || voiceMap[defaultVoiceKey]
  const bg = bgMap[background] ?? bgMap.transparent
  const bg_img = bg.url
  const config = {
    auto_ka: false,
    cleaning_text: true,
    emotion_version: 'v1_version',
    ...(char.enable_text_times_event ? { enable_text_times_event: true } : {}),
    figure_name: char.figure_name,
    frame_rate: 24,
    framedata_proto_version: 2,
    init_events: [
      {
        axis_id: 100,
        height: char.anchor_height,
        image: char.anchor_image,
        type: 'SetCharacterCanvasAnchor',
        width: char.anchor_width,
        x_location: char.anchor_x,
        y_location: char.anchor_y,
      },
      ...(bg_img ? [{
        type: 'widget_pic',
        data: { axis_id: 1, image: bg_img, width: 1, height: 1, x_location: 0, y_location: 0 },
      }] : []),
    ],
    is_large_model: false,
    is_vertical: false,
    language: 'chinese',
    lite_drive_style: driveStyle || char.lite_drive_style,
    look_name: char.look_name,
    mp_service_id: char.mp_service_id,
    optional_emotion: char.optional_emotion,
    pitch: 1,
    raw_audio: false,
    render_preset: char.render_preset,
    resolution: { height: 1920, width: 1080 },
    sta_face_id: char.sta_face_id,
    tts_emotion: 'neutral',
    tts_speed: 1,
    tts_split_length: 24,
    tts_split_row: 1,
    tts_vcn_id: vcfg.tts_vcn_id,
    volume: 1,
    walk_version: 3,
    background_img: bg_img,
    ...(isSdkBgVisible ? defaultLayout(bg) : screenLayout()),
  }
  return JSON.stringify(config, null, 2)
}
