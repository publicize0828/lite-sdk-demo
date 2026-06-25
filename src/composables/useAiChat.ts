import { ref } from 'vue'
import OpenAI from 'openai'
import { SDK_SYSTEM_PROMPT } from '../config/sdk-knowledge'

declare global { interface Window { __ENV__?: Record<string, string> } }

// 优先运行时 env.js 注入，fallback 到构建时 import.meta.env
function env(key: string, fallback = '') {
  return (typeof window !== 'undefined' && window.__ENV__?.[key]) || (import.meta as any).env[key] || fallback
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

let _client: OpenAI | null = null

function getClient() {
  const apiKey = env('VITE_LLM_API_KEY')
  console.log('[AI Chat] env check:', { hasWindowEnv: !!window.__ENV__, apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : '(empty)' })
  if (!apiKey) throw new Error('LLM API Key 未配置，请在环境变量中设置 VITE_LLM_API_KEY')

  if (!_client) {
    _client = new OpenAI({
      baseURL: env('VITE_LLM_ENDPOINT', 'https://api.deepseek.com'),
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }
  return _client
}

export function useAiChat() {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const currentReply = ref('')

  async function send(question: string) {
    if (!question.trim() || loading.value) return

    messages.value.push({ role: 'user', content: question })
    loading.value = true
    currentReply.value = ''

    try {
      const stream = await getClient().chat.completions.create({
        model: env('VITE_LLM_MODEL', 'deepseek-v4-pro'),
        messages: [
          { role: 'system', content: SDK_SYSTEM_PROMPT },
          ...messages.value.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      })

      let full = ''
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        full += delta
        currentReply.value = full
      }

      messages.value.push({ role: 'assistant', content: full })
    } catch (e: any) {
      const errMsg = e?.message ?? String(e)
      messages.value.push({ role: 'assistant', content: `请求失败：${errMsg}` })
    } finally {
      loading.value = false
      currentReply.value = ''
    }
  }

  function clear() {
    messages.value.length = 0
    currentReply.value = ''
  }

  return { messages, loading, currentReply, send, clear }
}
