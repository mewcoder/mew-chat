<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  disabled: boolean
  streaming: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
  clear: []
}>()

const text = ref('')

const canSend = computed(
  () => text.value.trim().length > 0 && !props.disabled,
)

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function resize(): void {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

watch(text, () => {
  void nextTick(() => resize())
})

function onSend(): void {
  const t = text.value.trim()
  if (!t || props.disabled) return
  text.value = ''
  emit('send', t)
  void nextTick(() => resize())
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}
</script>

<template>
  <div
    class="border-t border-stone-200/70 bg-[#faf8f5]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-stone-700/70 dark:bg-[#1c1917]/85"
  >
    <div class="mx-auto max-w-2xl px-4 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4">
      <div
        class="flex items-end gap-2 rounded-lg border border-stone-200/80 bg-white/95 p-1.5 shadow-ui-md ring-1 ring-black/[0.03] transition-[box-shadow,border-color] focus-within:border-orange-300/60 focus-within:shadow-ui-lg focus-within:ring-2 focus-within:ring-orange-200/50 dark:border-stone-600 dark:bg-stone-900/95 dark:ring-white/[0.06] dark:focus-within:border-orange-600/50 dark:focus-within:ring-orange-900/35 sm:gap-3 sm:p-2"
      >
        <textarea
          ref="textareaRef"
          v-model="text"
          rows="1"
          :disabled="streaming || disabled"
          placeholder="向 MewChat 发送消息…"
          class="max-h-48 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-3 py-3 text-[15px] leading-6 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-0 disabled:opacity-50 dark:text-stone-100 dark:placeholder:text-stone-500"
          @keydown="onKeydown"
        />
        <div class="flex shrink-0 flex-wrap items-center gap-1.5 pb-1 pr-0.5 sm:gap-2 sm:pb-1.5 sm:pr-1">
          <button
            v-if="streaming"
            type="button"
            class="rounded-lg bg-red-500 px-3.5 py-2 text-[13px] font-medium text-white shadow-ui-sm transition hover:bg-red-600 active:scale-[0.98] sm:px-4"
            @click="emit('stop')"
          >
            停止
          </button>
          <button
            v-else
            type="button"
            :disabled="!canSend"
            class="rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-ui-md transition hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-stone-200 disabled:to-stone-200 disabled:text-stone-400 disabled:shadow-none dark:disabled:from-stone-600 dark:disabled:to-stone-600 dark:disabled:text-stone-500 sm:px-4"
            @click="onSend"
          >
            发送
          </button>
          <button
            type="button"
            class="rounded-lg border border-stone-200/90 bg-stone-50/90 px-2.5 py-2 text-[13px] font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-700 sm:px-3"
            @click="emit('clear')"
          >
            清空
          </button>
        </div>
      </div>
      <p
        class="mt-2.5 text-center text-[11px] leading-relaxed text-stone-400/90 dark:text-stone-500"
      >
        Enter 发送 · Shift+Enter 换行 · MewChat 可能产生不准确信息，请自行核实重要内容。
      </p>
    </div>
  </div>
</template>
