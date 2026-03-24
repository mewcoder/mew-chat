import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_SYSTEM_PROMPT } from '../constants/embedSystemPrompt'
import type { ChatSettingsState } from '../types/chat'

const STORAGE_KEY = 'mewchat-settings'

/** 仅一次：老版本曾持久化空系统提示时，自动填入内置围栏说明 */
const MIGRATE_EMPTY_SYSTEM_PROMPT_KEY = 'mewchat-migrate-embed-default-v1'

function normalizeBaseUrl(url: string): string {
  const t = url.trim()
  if (!t) return ''
  return t.replace(/\/+$/, '')
}

const defaultState = (): ChatSettingsState => ({
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  useStream: true,
})

export const useChatSettingsStore = defineStore('chatSettings', () => {
  const settingsOpen = ref(false)
  const baseUrl = ref('')
  const apiKey = ref('')
  const model = ref('')
  const systemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
  const useStream = ref(true)

  const normalizedBaseUrl = computed(() => normalizeBaseUrl(baseUrl.value))

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
        systemPrompt.value = d.systemPrompt
        useStream.value = d.useStream
        return
      }
      const parsed = JSON.parse(raw) as Partial<ChatSettingsState>
      const d = defaultState()
      baseUrl.value = normalizeBaseUrl(
        typeof parsed.baseUrl === 'string' ? parsed.baseUrl : d.baseUrl,
      )
      apiKey.value = typeof parsed.apiKey === 'string' ? parsed.apiKey : d.apiKey
      model.value = typeof parsed.model === 'string' ? parsed.model : d.model
      let nextPrompt =
        typeof parsed.systemPrompt === 'string' ? parsed.systemPrompt : d.systemPrompt
      if (nextPrompt.trim() === '' && !localStorage.getItem(MIGRATE_EMPTY_SYSTEM_PROMPT_KEY)) {
        nextPrompt = DEFAULT_SYSTEM_PROMPT
        localStorage.setItem(MIGRATE_EMPTY_SYSTEM_PROMPT_KEY, '1')
      }
      systemPrompt.value = nextPrompt
      useStream.value =
        typeof parsed.useStream === 'boolean' ? parsed.useStream : d.useStream
    } catch {
      const d = defaultState()
      baseUrl.value = d.baseUrl
      apiKey.value = d.apiKey
      model.value = d.model
      systemPrompt.value = d.systemPrompt
      useStream.value = d.useStream
    }
  }

  function persist(): void {
    const state: ChatSettingsState = {
      baseUrl: normalizeBaseUrl(baseUrl.value),
      apiKey: apiKey.value,
      model: model.value.trim(),
      systemPrompt: systemPrompt.value,
      useStream: useStream.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  watch([baseUrl, apiKey, model, systemPrompt, useStream], persist, { deep: true })

  load()

  return {
    settingsOpen,
    baseUrl,
    apiKey,
    model,
    systemPrompt,
    useStream,
    normalizedBaseUrl,
    configInvalid,
    load,
    persist,
  }
})
