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
}>()

const segments = computed(() => parseChatMarkdown(props.content))

/** 必须与流式内容长度解耦，否则每增一字 :key 即变，会整段销毁/重建 v-html 导致闪动 */
function segmentKey(seg: ChatSegment, index: number): string {
  if (seg.type === 'html') {
    return `h-${index}`
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
        v-else
        :aria-busy="seg.partial ? 'true' : undefined"
      >
        <component :is="embedMap[seg.name]" v-bind="seg.props" />
      </div>
    </template>
  </div>
</template>
