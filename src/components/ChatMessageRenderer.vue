<script setup lang="ts">
import { computed } from 'vue'
import {
  parseChatMarkdown,
  sanitizeChatHtml,
  type ChatSegment,
} from '../utils/chatMarkdown'
import { embedMap } from './embeds/embedRegistry'

const props = defineProps<{
  content: string
  /** 当前条是否为正在流式输出的最后一条助手消息（用于 embed 占位文案） */
  streamingAssistant?: boolean
}>()

const segments = computed(() => parseChatMarkdown(props.content))

function segmentKey(seg: ChatSegment, index: number): string {
  if (seg.type === 'html') {
    return `h-${index}-${seg.html.length}`
  }
  if (seg.type === 'embed-pending') {
    return `p-${index}-${seg.lang}`
  }
  return `e-${index}-${seg.name}`
}
</script>

<template>
  <div
    class="chat-md-assistant prose prose-stone prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-orange-600 dark:prose-a:text-orange-400 space-y-4"
  >
    <template v-for="(seg, i) in segments" :key="segmentKey(seg, i)">
      <div
        v-if="seg.type === 'html'"
        class="chat-md-fragment"
        v-html="sanitizeChatHtml(seg.html)"
      />
      <div
        v-else-if="seg.type === 'embed-pending'"
        class="rounded-lg border border-dashed border-stone-300/80 bg-stone-50/80 px-3 py-2 text-[13px] text-stone-500 dark:border-stone-600 dark:bg-stone-900/40 dark:text-stone-400"
        role="status"
        aria-live="polite"
      >
        {{
          props.streamingAssistant
            ? '正在加载可视化组件…'
            : '组件数据未解析成功，请重试或检查输出是否为合法 JSON。'
        }}
      </div>
      <div
        v-else
        :class="
          seg.partial
            ? 'rounded-xl ring-1 ring-amber-300/45 dark:ring-amber-500/35'
            : ''
        "
        :aria-busy="seg.partial ? 'true' : undefined"
      >
        <component :is="embedMap[seg.name]" v-bind="seg.props" />
      </div>
    </template>
  </div>
</template>
