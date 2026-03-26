<script setup lang="ts">
import { computed } from 'vue'

type Level = 'info' | 'success' | 'warning' | 'error'

const props = withDefaults(
  defineProps<{
    title?: string
    message: string
    level?: Level
  }>(),
  { level: 'info' },
)

const skin = computed(() => {
  switch (props.level) {
    case 'success':
      return {
        wrap: 'border-emerald-200/90 bg-emerald-50/90',
        bar: 'bg-emerald-500',
        title: 'text-emerald-900',
        msg: 'text-emerald-800',
      }
    case 'warning':
      return {
        wrap: 'border-amber-200/90 bg-amber-50/90',
        bar: 'bg-amber-500',
        title: 'text-amber-950',
        msg: 'text-amber-900',
      }
    case 'error':
      return {
        wrap: 'border-rose-200/90 bg-rose-50/90',
        bar: 'bg-rose-500',
        title: 'text-rose-900',
        msg: 'text-rose-800',
      }
    default:
      return {
        wrap: 'border-sky-200/90 bg-sky-50/80',
        bar: 'bg-sky-500',
        title: 'text-sky-950',
        msg: 'text-sky-900',
      }
  }
})
</script>

<template>
  <div
    class="flex gap-3 overflow-hidden rounded-xl border shadow-ui-sm"
    :class="skin.wrap"
    role="status"
  >
    <div class="w-1 shrink-0 self-stretch" :class="skin.bar" aria-hidden="true" />
    <div class="min-w-0 py-3 pr-4">
      <div v-if="title" class="text-xs font-semibold" :class="skin.title">
        {{ title }}
      </div>
      <p
        class="text-[13px] leading-snug"
        :class="[title ? 'mt-1 ' + skin.msg : skin.msg]"
      >
        {{ message }}
      </p>
    </div>
  </div>
</template>
