<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatSettingsStore } from '../stores/chatSettings'
import { DEFAULT_SYSTEM_PROMPT } from '../constants/embedSystemPrompt'

const store = useChatSettingsStore()
const { settingsOpen, baseUrl, apiKey, model, systemPrompt, useStream } = storeToRefs(store)

function insertDefaultSystemPrompt(): void {
  systemPrompt.value = DEFAULT_SYSTEM_PROMPT
}

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

watch(settingsOpen, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
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
        class="flex max-h-[min(100dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-lg border border-stone-200/80 bg-[#faf8f5]/98 shadow-ui-dialog ring-1 ring-black/[0.04] backdrop-blur-md dark:border-stone-600 dark:bg-stone-900/98 dark:ring-white/[0.06] sm:max-h-[90vh] sm:rounded-lg"
        @click.stop
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-stone-200/80 px-5 py-4 dark:border-stone-700"
        >
          <h2
            id="api-settings-title"
            class="text-[15px] font-semibold text-stone-900 dark:text-stone-100"
          >
            模型与 API 配置
          </h2>
          <button
            type="button"
            class="rounded-lg p-2 text-stone-400 transition hover:bg-stone-200/80 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
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
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p
            class="rounded-lg border border-orange-200/70 bg-orange-50/80 p-3 text-[12px] leading-relaxed text-orange-950 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-100"
          >
            纯前端直连第三方 API 时，目标服务必须允许当前页面的来源（CORS）。若浏览器报跨域错误，请改用支持浏览器来源的网关或代理，勿将密钥提交到公开仓库。
          </p>
          <label class="block">
            <span class="mb-1.5 block text-[12px] font-medium text-stone-500 dark:text-stone-400"
              >Base URL</span
            >
            <input
              v-model="baseUrl"
              type="url"
              autocomplete="off"
              placeholder="https://api.openai.com"
              class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-ui-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-700 dark:focus:ring-orange-900/40"
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[12px] font-medium text-stone-500 dark:text-stone-400"
              >API Key</span
            >
            <input
              v-model="apiKey"
              type="password"
              autocomplete="off"
              placeholder="sk-..."
              class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-ui-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-700 dark:focus:ring-orange-900/40"
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[12px] font-medium text-stone-500 dark:text-stone-400"
              >Model</span
            >
            <input
              v-model="model"
              type="text"
              autocomplete="off"
              placeholder="gpt-4o-mini"
              class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-ui-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-700 dark:focus:ring-orange-900/40"
            />
          </label>
          <div class="block">
            <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span class="text-[12px] font-medium text-stone-500 dark:text-stone-400"
                >系统提示</span
              >
              <button
                type="button"
                class="shrink-0 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700/80"
                @click="insertDefaultSystemPrompt"
              >
                插入内置说明（KPI / 表格 / 提示条）
              </button>
            </div>
            <p class="mb-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              内置说明会告诉模型：在合适时用围栏
              <code class="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] dark:bg-stone-700">kpi</code>、
              <code class="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] dark:bg-stone-700">data-table</code>、
              <code class="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] dark:bg-stone-700">alert</code>
              ，这样你问「做个表」「给个指标」「提醒一下」时，回复才能被渲染成组件。
            </p>
            <textarea
              v-model="systemPrompt"
              rows="10"
              placeholder="可留空；建议点击上方按钮插入内置说明。"
              class="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-800 shadow-ui-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-700 dark:focus:ring-orange-900/40"
            />
          </div>
          <label class="flex cursor-pointer items-center gap-2.5">
            <input
              v-model="useStream"
              type="checkbox"
              class="size-4 rounded-sm border-stone-300 text-orange-600 focus:ring-2 focus:ring-orange-300/50 dark:border-stone-500 dark:text-orange-500 dark:focus:ring-orange-800/40"
            />
            <span class="text-sm text-stone-700 dark:text-stone-300">流式输出（SSE）</span>
          </label>
        </div>
        <div
          class="flex shrink-0 justify-end gap-2 border-t border-stone-200/80 px-5 py-4 dark:border-stone-700"
        >
          <button
            type="button"
            class="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-ui-sm transition hover:bg-orange-700 active:scale-[0.99] dark:bg-orange-600 dark:hover:bg-orange-500"
            @click="close"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
