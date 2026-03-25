import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_SYSTEM_PROMPT,
  buildEffectiveSystemPrompt,
} from '../constants/embedSystemPrompt'
import type { ChatSettingsState } from '../types/chat'

const STORAGE_KEY = 'mewchat-settings'

function normalizeBaseUrl(url: string): string {
  const t = url.trim()
  if (!t) return ''
  return t.replace(/\/+$/, '')
}

/** 从旧版「整段 system」迁出仅用户差异部分 */
function migrateLegacySystemPrompt(legacy: unknown): string {
  if (typeof legacy !== 'string') return ''
  const full = legacy
  if (full.trim() === '') return ''
  if (full.trim() === DEFAULT_SYSTEM_PROMPT.trim()) return ''
  if (full.startsWith(DEFAULT_SYSTEM_PROMPT)) {
    return full.slice(DEFAULT_SYSTEM_PROMPT.length).replace(/^\s+/, '')
  }
  return full
}

const defaultState = (): ChatSettingsState => ({
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPromptExtra: '',
})

export const useChatSettingsStore = defineStore('chatSettings', () => {
  const settingsOpen = ref(false)
  const baseUrl = ref('')
  const apiKey = ref('')
  const model = ref('')
  const systemPromptExtra = ref('')

  const normalizedBaseUrl = computed(() => normalizeBaseUrl(baseUrl.value))

  const effectiveSystemPrompt = computed(() =>
    buildEffectiveSystemPrompt(systemPromptExtra.value),
  )

  const configInvalid = computed(
    () => !normalizedBaseUrl.value || !model.value.trim(),
  )

  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const d = defaultState()
        baseUrl.value = d.baseUrl
        apiKey.value = d.apiKey
        model.value = d.model
        systemPromptExtra.value = d.systemPromptExtra
        return
      }
      const parsed = JSON.parse(raw) as Partial<ChatSettingsState> & {
        systemPrompt?: string
        useStream?: boolean
        renderMode?: string
        pacedCharsPerFrame?: number
      }
      const d = defaultState()
      baseUrl.value = normalizeBaseUrl(
        typeof parsed.baseUrl === 'string' ? parsed.baseUrl : d.baseUrl,
      )
      apiKey.value = typeof parsed.apiKey === 'string' ? parsed.apiKey : d.apiKey
      model.value = typeof parsed.model === 'string' ? parsed.model : d.model
      if (typeof parsed.systemPromptExtra === 'string') {
        systemPromptExtra.value = parsed.systemPromptExtra
      } else {
        systemPromptExtra.value = migrateLegacySystemPrompt(parsed.systemPrompt)
      }
    } catch {
      const d = defaultState()
      baseUrl.value = d.baseUrl
      apiKey.value = d.apiKey
      model.value = d.model
      systemPromptExtra.value = d.systemPromptExtra
    }
  }

  function persist(): void {
    const state: ChatSettingsState = {
      baseUrl: normalizeBaseUrl(baseUrl.value),
      apiKey: apiKey.value,
      model: model.value.trim(),
      systemPromptExtra: systemPromptExtra.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  watch(
    [baseUrl, apiKey, model, systemPromptExtra],
    persist,
  )

  load()

  return {
    settingsOpen,
    baseUrl,
    apiKey,
    model,
    systemPromptExtra,
    effectiveSystemPrompt,
    normalizedBaseUrl,
    configInvalid,
    load,
    persist,
  }
})
