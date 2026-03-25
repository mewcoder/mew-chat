import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ChatSettingsState, ModelPreset } from '../types/chat'

const STORAGE_KEY = 'mewchat-settings'

function normalizeBaseUrl(url: string): string {
  const t = url.trim()
  if (!t) return ''
  return t.replace(/\/+$/, '')
}

const defaultState = (): ChatSettingsState => ({
  baseUrl: '',
  apiKey: '',
  models: [],
  currentModelId: '',
})

/** 从可能含旧字段 id 或未 trim 的数据规范化 */
function normalizeImportedPreset(o: Record<string, unknown>): ModelPreset | null {
  const modelId = typeof o.modelId === 'string' ? o.modelId.trim() : ''
  if (!modelId) return null
  const rawName = typeof o.name === 'string' ? o.name.trim() : ''
  const name = rawName || modelId
  return { name, modelId }
}

function dedupePresets(rows: ModelPreset[]): ModelPreset[] {
  const seen = new Set<string>()
  const out: ModelPreset[] = []
  for (const r of rows) {
    if (seen.has(r.modelId)) continue
    seen.add(r.modelId)
    out.push(r)
  }
  return out
}

export const useChatSettingsStore = defineStore('chatSettings', () => {
  const settingsOpen = ref(false)
  const baseUrl = ref('')
  const apiKey = ref('')
  const models = ref<ModelPreset[]>([])
  const currentModelId = ref('')

  const normalizedBaseUrl = computed(() => normalizeBaseUrl(baseUrl.value))

  const currentPreset = computed(
    () => models.value.find((m) => m.modelId === currentModelId.value) ?? null,
  )

  const currentApiModel = computed(() => currentPreset.value?.modelId.trim() ?? '')

  const configInvalid = computed(
    () => !normalizedBaseUrl.value || !currentApiModel.value,
  )

  function addModelPreset(name: string, modelId: string): void {
    const mid = modelId.trim()
    if (!mid) return
    const display = name.trim() || mid
    const existing = models.value.find((m) => m.modelId === mid)
    if (existing) {
      existing.name = display
      currentModelId.value = mid
      return
    }
    models.value.push({ name: display, modelId: mid })
    currentModelId.value = mid
  }

  function removeModelPreset(modelId: string): void {
    const idx = models.value.findIndex((m) => m.modelId === modelId)
    if (idx === -1) return
    models.value.splice(idx, 1)
    if (currentModelId.value === modelId) {
      currentModelId.value = models.value[0]?.modelId ?? ''
    }
  }

  function selectModelPreset(modelId: string): void {
    if (models.value.some((m) => m.modelId === modelId)) {
      currentModelId.value = modelId
    }
  }

  /**
   * 用户编辑 modelId 输入框后：若变更则需同步 currentModelId 并避免与其他行冲突。
   */
  function finalizePresetModelIdEdit(preset: ModelPreset, previousModelId: string): void {
    const prev = previousModelId.trim()
    let next = preset.modelId.trim()
    if (!next) {
      preset.modelId = prev || preset.modelId
      return
    }
    if (next === prev) return

    const other = models.value.find((m) => m !== preset && m.modelId === next)
    if (other) {
      preset.modelId = prev
      return
    }

    preset.modelId = next
    if (currentModelId.value === prev) {
      currentModelId.value = next
    }
  }

  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const d = defaultState()
        baseUrl.value = d.baseUrl
        apiKey.value = d.apiKey
        models.value = []
        currentModelId.value = ''
        return
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const d = defaultState()
      baseUrl.value = normalizeBaseUrl(
        typeof parsed.baseUrl === 'string' ? parsed.baseUrl : d.baseUrl,
      )
      apiKey.value = typeof parsed.apiKey === 'string' ? parsed.apiKey : d.apiKey

      const rawModels = parsed.models
      if (Array.isArray(rawModels) && rawModels.length > 0) {
        if (typeof rawModels[0] === 'string') {
          const rows = (rawModels as string[])
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter(Boolean)
            .map((modelId) => ({ name: modelId, modelId }))
          models.value = dedupePresets(rows)
        } else {
          const rows: ModelPreset[] = []
          for (const item of rawModels) {
            if (!item || typeof item !== 'object') continue
            const n = normalizeImportedPreset(item as Record<string, unknown>)
            if (n) rows.push(n)
          }
          models.value = rows.length > 0 ? dedupePresets(rows) : []
        }
      } else {
        models.value = []
      }

      let idFromStore =
        typeof parsed.currentModelId === 'string' ? parsed.currentModelId.trim() : ''
      if (!idFromStore && typeof parsed.currentModel === 'string') {
        idFromStore = parsed.currentModel.trim()
      }

      if (
        idFromStore &&
        !models.value.some((m) => m.modelId === idFromStore) &&
        Array.isArray(rawModels)
      ) {
        for (const item of rawModels) {
          if (!item || typeof item !== 'object') continue
          const o = item as Record<string, unknown>
          if (typeof o.id === 'string' && o.id.trim() === idFromStore) {
            const n = normalizeImportedPreset(o)
            if (n && models.value.some((m) => m.modelId === n.modelId)) {
              idFromStore = n.modelId
              break
            }
          }
        }
      }

      if (
        idFromStore &&
        models.value.some((m) => m.modelId === idFromStore)
      ) {
        currentModelId.value = idFromStore
      } else {
        currentModelId.value = models.value[0]?.modelId ?? ''
      }
    } catch {
      const d = defaultState()
      baseUrl.value = d.baseUrl
      apiKey.value = d.apiKey
      models.value = []
      currentModelId.value = ''
    }
  }

  function persist(): void {
    const state: ChatSettingsState = {
      baseUrl: normalizeBaseUrl(baseUrl.value),
      apiKey: apiKey.value,
      models: models.value.map((m) => ({ ...m })),
      currentModelId: currentModelId.value.trim(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  watch([baseUrl, apiKey, currentModelId, models], persist, { deep: true })

  load()

  return {
    settingsOpen,
    baseUrl,
    apiKey,
    models,
    currentModelId,
    currentPreset,
    currentApiModel,
    normalizedBaseUrl,
    configInvalid,
    addModelPreset,
    removeModelPreset,
    selectModelPreset,
    finalizePresetModelIdEdit,
    load,
    persist,
  }
})
