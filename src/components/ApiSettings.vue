<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import type { ModelPreset } from '../types/chat'
import { useChatSettingsStore } from '../stores/chatSettings'
import { testOpenAiCompatibleConnectivity } from '../utils/apiConnectivity'

const store = useChatSettingsStore()
const { settingsOpen, baseUrl, apiKey, models, currentModelId } = storeToRefs(store)

const apiTestLoading = ref(false)
const apiTestHint = ref<{ ok: boolean; text: string } | null>(null)
let apiTestController: AbortController | null = null

const newDisplayName = ref('')
const newModelId = ref('')
const showAddPresetForm = ref(false)

function close(): void {
  settingsOpen.value = false
}

function onBackdropClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) close()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && settingsOpen.value) {
    e.preventDefault()
    close()
  }
}

function addPreset(): void {
  const mid = newModelId.value.trim()
  if (!mid) return
  store.addModelPreset(newDisplayName.value, mid)
  newDisplayName.value = ''
  newModelId.value = ''
  showAddPresetForm.value = false
}

function cancelAddPresetForm(): void {
  showAddPresetForm.value = false
  newDisplayName.value = ''
  newModelId.value = ''
}

function removePreset(preset: ModelPreset): void {
  store.removeModelPreset(preset.modelId)
}

function onDisplayNameBlur(preset: ModelPreset): void {
  const t = preset.name.trim()
  if (!t) preset.name = preset.modelId.trim() || '未命名'
}

const modelIdOnFocus = ref<string | null>(null)

function onModelIdFocus(preset: ModelPreset): void {
  modelIdOnFocus.value = preset.modelId
}

function onModelIdBlur(preset: ModelPreset): void {
  const prev = modelIdOnFocus.value
  modelIdOnFocus.value = null
  if (prev == null) return
  store.finalizePresetModelIdEdit(preset, prev)
}

async function runApiTest(): Promise<void> {
  if (apiTestLoading.value) return
  apiTestHint.value = null
  apiTestController = new AbortController()
  apiTestLoading.value = true
  try {
    const r = await testOpenAiCompatibleConnectivity(
      baseUrl.value,
      apiKey.value,
      currentModelId.value,
      apiTestController.signal,
    )
    apiTestHint.value = { ok: r.ok, text: r.message }
  } finally {
    apiTestLoading.value = false
    apiTestController = null
  }
}

watch(settingsOpen, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    showAddPresetForm.value = false
    newDisplayName.value = ''
    newModelId.value = ''
    apiTestHint.value = null
    apiTestController?.abort()
    apiTestController = null
    apiTestLoading.value = false
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  apiTestController?.abort()
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-show="settingsOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-title"
        class="flex max-h-[min(100dvh,44rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-stone-200/80 bg-[#faf8f5]/98 shadow-ui-dialog ring-1 ring-black/[0.04] backdrop-blur-md sm:max-h-[90vh] sm:rounded-2xl"
        @click.stop
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-stone-200/80 px-5 py-4"
        >
          <div>
            <h2
              id="api-settings-title"
              class="text-[15px] font-semibold tracking-tight text-stone-900"
            >
              模型与 API
            </h2>
            <p class="mt-0.5 text-[12px] text-stone-500">
              为每个接入点设置显示名称与实际模型 ID
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl p-2 text-stone-400 transition hover:bg-stone-200/80 hover:text-stone-700"
            aria-label="关闭"
            @click="close"
          >
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[12px] font-medium text-stone-600">Base URL</span>
              <input
                v-model="baseUrl"
                type="url"
                autocomplete="off"
                placeholder="https://…"
                class="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-ui-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/60"
              />
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[12px] font-medium text-stone-600">API Key</span>
              <input
                v-model="apiKey"
                type="password"
                autocomplete="off"
                placeholder="sk-…"
                class="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-ui-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/60"
              />
            </label>
          </div>

          <div>
            <h3 class="mb-2 text-[13px] font-semibold text-stone-900">model</h3>

            <div
              class="overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-ui-sm ring-1 ring-black/[0.02]"
            >
              <table class="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr class="border-b border-stone-200/80 bg-stone-100/80">
                    <th
                      scope="col"
                      class="w-[6.5rem] px-2 py-2.5 pl-3 text-[11px] font-semibold tracking-wide text-stone-500 sm:w-28"
                    >
                      名称
                    </th>
                    <th
                      scope="col"
                      class="min-w-0 px-2 py-2.5 text-[11px] font-semibold tracking-wide text-stone-500"
                    >
                      modelId
                    </th>
                    <th
                      scope="col"
                      class="w-14 shrink-0 px-1 py-2.5 text-center text-[11px] font-semibold text-stone-400 sm:w-16"
                    >
                      <span class="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="models.length === 0">
                    <td colspan="3" class="px-3 py-8 text-center text-[12px] text-stone-400">
                      暂无 model，可在下方添加
                    </td>
                  </tr>
                  <tr
                    v-for="(preset, idx) in models"
                    :key="preset.modelId"
                    class="border-b border-stone-100 bg-white last:border-b-0"
                  >
                    <td class="align-middle p-2 pl-3">
                      <label class="sr-only" :for="`preset-name-${idx}`">名称</label>
                      <input
                        :id="`preset-name-${idx}`"
                        v-model="preset.name"
                        type="text"
                        autocomplete="off"
                        placeholder="名称"
                        class="w-full min-w-0 rounded-md border border-stone-200/90 bg-stone-50/40 px-2 py-1.5 text-[13px] text-stone-800 transition focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200/50"
                        @blur="onDisplayNameBlur(preset)"
                      />
                    </td>
                    <td class="min-w-0 align-middle p-2">
                      <label class="sr-only" :for="`preset-mid-${idx}`">modelId</label>
                      <input
                        :id="`preset-mid-${idx}`"
                        v-model="preset.modelId"
                        type="text"
                        autocomplete="off"
                        spellcheck="false"
                        placeholder="modelId"
                        class="w-full min-w-0 rounded-md border border-stone-200/90 bg-stone-50/40 px-2 py-1.5 font-mono text-[13px] text-stone-800 transition focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200/50"
                        @focus="onModelIdFocus(preset)"
                        @blur="onModelIdBlur(preset)"
                      />
                    </td>
                    <td class="align-middle p-2 pr-3 text-center">
                      <button
                        type="button"
                        class="rounded-md px-1.5 py-1.5 text-[11px] font-medium text-red-600/90 transition hover:bg-red-50 hover:text-red-700"
                        @click="removePreset(preset)"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!showAddPresetForm" class="mt-3">
              <button
                type="button"
                class="rounded-lg border border-dashed border-stone-300/90 bg-white/60 px-3 py-2 text-[12px] font-medium text-stone-600 transition hover:border-orange-300/80 hover:bg-orange-50/50 hover:text-stone-800"
                @click="showAddPresetForm = true"
              >
                添加 model
              </button>
            </div>

            <div
              v-else
              class="mt-3 rounded-xl border-2 border-dashed border-stone-200/90 bg-stone-50/40 p-3"
            >
              <p class="mb-2 text-[12px] font-medium text-stone-600">添加 model</p>
              <div
                class="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,7rem)_1fr_auto] sm:items-center"
              >
                <label class="sr-only" for="new-preset-name">名称（可空）</label>
                <input
                  id="new-preset-name"
                  v-model="newDisplayName"
                  type="text"
                  autocomplete="off"
                  placeholder="名称"
                  class="w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[13px] text-stone-800 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/50 sm:max-w-28"
                  @keydown.enter="addPreset"
                />
                <label class="sr-only" for="new-preset-mid">modelId</label>
                <input
                  id="new-preset-mid"
                  v-model="newModelId"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="modelId"
                  class="w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 font-mono text-[13px] text-stone-800 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/50"
                  @keydown.enter="addPreset"
                />
                <div class="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                  <button
                    type="button"
                    class="rounded-lg bg-orange-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-ui-sm transition hover:bg-orange-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
                    :disabled="!newModelId.trim()"
                    @click="addPreset"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-stone-200/90 bg-white px-3 py-1.5 text-[12px] font-medium text-stone-600 transition hover:bg-stone-50"
                    @click="cancelAddPresetForm"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex shrink-0 items-center justify-between gap-3 border-t border-stone-200/80 bg-[#faf8f5]/90 px-5 py-4"
        >
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              class="shrink-0 rounded-lg border border-stone-200/90 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 shadow-ui-sm transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="apiTestLoading"
              @click="runApiTest"
            >
              {{ apiTestLoading ? '测试中…' : '测试通信' }}
            </button>
            <span
              v-if="apiTestHint"
              class="text-[12px] font-medium leading-snug"
              :class="apiTestHint.ok ? 'text-emerald-600' : 'text-red-600'"
            >
              {{ apiTestHint.ok ? '测试通过' : apiTestHint.text }}
            </span>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl bg-orange-600 px-8 py-2.5 text-sm font-semibold text-white shadow-ui-sm transition hover:bg-orange-700 active:scale-[0.99]"
            @click="close"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
