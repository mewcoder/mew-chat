/** OpenAI 兼容接口连通性探测（与 useChat 同源路径风格） */

const MODELS_PATH = '/v1/models'
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions'
const HTTP_ERROR_BODY_MAX_LEN = 500

interface ErrorMessageJson {
  error?: { message?: string }
}

function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return `${base}${path}`
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const json = JSON.parse(text) as ErrorMessageJson
    if (json.error?.message) return json.error.message
  } catch {
    /* 非 JSON */
  }
  if (text) return text.slice(0, HTTP_ERROR_BODY_MAX_LEN)
  return `HTTP ${response.status} ${response.statusText}`
}

export type ApiConnectivityResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * 先 GET /v1/models；若为 404 再 POST 最小非流式 chat（需 modelId，可能消耗极少 token）。
 */
export async function testOpenAiCompatibleConnectivity(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  signal?: AbortSignal,
): Promise<ApiConnectivityResult> {
  const base = baseUrl.trim()
  if (!base) {
    return { ok: false, message: '请先填写 Base URL' }
  }

  const authHeaders: Record<string, string> = {}
  const key = apiKey.trim()
  if (key) authHeaders.Authorization = `Bearer ${key}`

  try {
    const modelsUrl = buildUrl(base, MODELS_PATH)
    const modelsRes = await fetch(modelsUrl, {
      method: 'GET',
      headers: { ...authHeaders },
      signal,
    })

    if (modelsRes.ok) {
      return { ok: true, message: '连接正常（/v1/models）' }
    }

    if (modelsRes.status !== 404) {
      return { ok: false, message: await readHttpErrorMessage(modelsRes) }
    }

    const mid = modelId.trim()
    if (!mid) {
      return {
        ok: false,
        message: '当前网关无 /v1/models，请添加至少一个 model 后重试（将改用 chat 接口探测）',
      }
    }

    const chatUrl = buildUrl(base, CHAT_COMPLETIONS_PATH)
    const chatRes = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        model: mid,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      }),
      signal,
    })

    if (chatRes.ok) {
      return { ok: true, message: '连接正常（/v1/chat/completions）' }
    }
    return { ok: false, message: await readHttpErrorMessage(chatRes) }
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, message: '已取消' }
    }
    const msg = error instanceof Error ? error.message : String(error)
    return { ok: false, message: msg }
  }
}
