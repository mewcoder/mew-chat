import { ref, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { ChatMessage } from '../types/chat'
import { useChatSettingsStore } from '../stores/chatSettings'

// ---------------------------------------------------------------------------
// 与 OpenAI 兼容的 Chat Completions API（/v1/chat/completions）
// ---------------------------------------------------------------------------

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions'
const HTTP_ERROR_BODY_MAX_LEN = 500

interface ChatCompletionErrorJson {
  error?: { message?: string }
}

/** 非流式：完整 JSON 响应 */
interface ChatCompletionJsonBody {
  choices?: Array<{ message?: { content?: string } }>
}

/** 流式：单行 SSE data 解析后的结构 */
interface ChatCompletionStreamChunk {
  choices?: Array<{
    delta?: { content?: string; reasoning_content?: string }
  }>
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/** 展示在气泡里的错误文案 */
function formatErrorForUser(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 包装为 Error，便于上层统一处理 */
function ensureError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return `${base}${CHAT_COMPLETIONS_PATH}`
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const json = JSON.parse(text) as ChatCompletionErrorJson
    if (json.error?.message) return json.error.message
  } catch {
    /* 非 JSON */
  }
  if (text) return text.slice(0, HTTP_ERROR_BODY_MAX_LEN)
  return `HTTP ${response.status} ${response.statusText}`
}

/**
 * 组装发给接口的 messages：
 * - 去掉末尾占位用的 assistant（空回复）
 * - 若有系统提示，前置一条 system
 */
function buildMessagesForApiRequest(
  thread: ChatMessage[],
  systemPrompt: string,
): ChatMessage[] {
  let core = [...thread]
  const last = core[core.length - 1]
  if (last?.role === 'assistant') {
    core = core.slice(0, -1)
  }
  const system = systemPrompt.trim()
  if (!system) return core
  return [{ role: 'system', content: system }, ...core]
}

function extractDeltaTextFromStreamChunk(
  chunk: ChatCompletionStreamChunk,
): string | undefined {
  const delta = chunk.choices?.[0]?.delta
  if (delta?.content) return delta.content
  if (typeof delta?.reasoning_content === 'string') return delta.reasoning_content
  return undefined
}

/**
 * 解析 OpenAI 兼容的 SSE：data: {...} 行，忽略非 data 行与坏行。
 * 扩展新字段时主要改 extractDeltaTextFromStreamChunk。
 */
async function consumeChatCompletionSse(
  body: ReadableStream<Uint8Array> | null,
  onTextDelta: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  if (!body) throw new Error('响应体为空')
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') return
        try {
          const json = JSON.parse(payload) as ChatCompletionStreamChunk
          const text = extractDeltaTextFromStreamChunk(json)
          if (text) onTextDelta(text)
        } catch {
          /* 跳过无法解析的行 */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function readNonStreamAssistantText(response: Response): Promise<string> {
  const data = (await response.json()) as ChatCompletionJsonBody
  return data.choices?.[0]?.message?.content ?? ''
}

interface ChatCompletionRequestParams {
  baseUrl: string
  apiKey: string
  model: string
  /** 当前会话（含末尾空 assistant 占位） */
  thread: ChatMessage[]
  systemPrompt: string
  useStream: boolean
  signal: AbortSignal
  onTextDelta: (chunk: string) => void
}

/**
 * POST /v1/chat/completions；中止时不抛错（与 fetch 的 AbortError 行为一致）。
 */
async function requestChatCompletion(
  params: ChatCompletionRequestParams,
): Promise<void> {
  const {
    baseUrl,
    apiKey,
    model,
    thread,
    systemPrompt,
    useStream,
    signal,
    onTextDelta,
  } = params

  const url = buildChatCompletionsUrl(baseUrl)
  const messages = buildMessagesForApiRequest(thread, systemPrompt)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.trim(),
        messages,
        stream: useStream,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(await readHttpErrorMessage(response))
    }

    if (!useStream) {
      const text = await readNonStreamAssistantText(response)
      if (text) onTextDelta(text)
      return
    }

    await consumeChatCompletionSse(response.body, onTextDelta, signal)
  } catch (error) {
    if (isAbortError(error)) return
    throw ensureError(error)
  }
}

// ---------------------------------------------------------------------------
// 会话列表上的助手消息更新（便于单测与扩展「重试」等）
// ---------------------------------------------------------------------------

function appendToAssistantAt(
  messages: Ref<ChatMessage[]>,
  assistantIndex: number,
  chunk: string,
): void {
  const row = messages.value[assistantIndex]
  if (row?.role === 'assistant') {
    row.content += chunk
  }
}

function setAssistantErrorAt(
  messages: Ref<ChatMessage[]>,
  assistantIndex: number,
  error: unknown,
): void {
  const row = messages.value[assistantIndex]
  if (row?.role === 'assistant') {
    row.content = `请求失败：${formatErrorForUser(error)}`
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useChat() {
  const settingsStore = useChatSettingsStore()
  const { normalizedBaseUrl, apiKey, model, systemPrompt, useStream } =
    storeToRefs(settingsStore)

  const messages = ref<ChatMessage[]>([])
  const streaming = ref(false)

  let abortController: AbortController | null = null

  function stop(): void {
    abortController?.abort()
    abortController = null
    streaming.value = false
  }

  async function sendMessage(text: string): Promise<void> {
    messages.value.push({ role: 'user', content: text })
    messages.value.push({ role: 'assistant', content: '' })

    const assistantIndex = messages.value.length - 1

    abortController = new AbortController()
    const { signal } = abortController
    streaming.value = true

    try {
      await requestChatCompletion({
        baseUrl: normalizedBaseUrl.value,
        apiKey: apiKey.value,
        model: model.value,
        thread: messages.value,
        systemPrompt: systemPrompt.value,
        useStream: useStream.value,
        signal,
        onTextDelta(chunk) {
          appendToAssistantAt(messages, assistantIndex, chunk)
        },
      })
    } catch (error) {
      setAssistantErrorAt(messages, assistantIndex, error)
    } finally {
      streaming.value = false
      abortController = null
    }
  }

  function clearChat(): void {
    if (streaming.value) stop()
    messages.value = []
  }

  return {
    messages,
    streaming,
    sendMessage,
    stop,
    clearChat,
  }
}
