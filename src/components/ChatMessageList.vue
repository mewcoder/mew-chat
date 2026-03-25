<script setup lang="ts">
import type { ChatMessage } from '../types/chat'
import ChatMessageRenderer from './ChatMessageRenderer.vue'

defineProps<{
  messages: ChatMessage[]
}>()
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="messages.length === 0"
      class="relative mx-auto flex min-h-[min(60dvh,28rem)] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center"
    >
      <div
        class="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-orange-200/35 via-amber-100/25 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div class="relative z-[1] flex max-w-md flex-col items-center gap-4">
        <h2 class="text-xl font-semibold tracking-tight text-stone-900">
          开始一段对话
        </h2>
        <p class="text-[15px] leading-relaxed text-stone-500">
          在下方输入消息即可发送。首次使用请点击右上角「模型配置」。
        </p>
        <p class="max-w-md text-[13px] leading-relaxed text-stone-500">
          如需追加个性化规则，可在「模型配置」中填写额外系统说明。
        </p>
      </div>
    </div>
    <div
      v-else
      class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-5 sm:py-8"
    >
      <div v-for="(msg, idx) in messages" :key="idx" class="w-full">
        <div
          v-if="msg.role === 'user'"
          class="ml-auto w-[min(100%,42rem)] rounded-lg border border-stone-200/80 bg-white px-4 py-3 text-[15px] leading-7 text-stone-800 shadow-ui-sm ring-1 ring-black/[0.02]"
        >
          <div class="whitespace-pre-wrap break-words">{{ msg.content }}</div>
        </div>
        <div v-else class="w-full break-words text-[15px] leading-7 text-stone-800">
          <ChatMessageRenderer :content="msg.content" />
        </div>
      </div>
    </div>
  </div>
</template>
