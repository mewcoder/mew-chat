<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
}>()

const skin = computed(() => {
  switch (props.variant ?? 'info') {
    case 'success':
      return 'border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-50'
    case 'warning':
      return 'border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-50'
    case 'error':
      return 'border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-50'
    default:
      return 'border-sky-200/90 bg-sky-50/90 text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-50'
  }
})
</script>

<template>
  <div
    class="rounded-xl border px-4 py-3 shadow-ui-sm"
    :class="skin"
    role="alert"
  >
    <div v-if="title" class="text-sm font-semibold">
      {{ title }}
    </div>
    <p class="text-[13px] leading-relaxed" :class="title ? 'mt-1' : ''">
      {{ message }}
    </p>
  </div>
</template>
