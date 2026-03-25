<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: string | number
  hint?: string
  trend?: 'up' | 'down' | 'neutral'
}>()

const trendLabel = computed(() => {
  switch (props.trend) {
    case 'up':
      return '上升'
    case 'down':
      return '下降'
    default:
      return ''
  }
})
</script>

<template>
  <div
    class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] px-4 py-3 shadow-ui-sm"
    role="region"
    :aria-label="title"
  >
    <div class="text-xs font-medium uppercase tracking-wide text-stone-500">
      {{ title }}
    </div>
    <div class="mt-1 flex flex-wrap items-baseline gap-2">
      <span class="text-2xl font-semibold tabular-nums text-stone-900">
        {{ value }}
      </span>
      <span
        v-if="trend && trend !== 'neutral'"
        class="text-xs font-medium"
        :class="{
          'text-emerald-600': trend === 'up',
          'text-rose-600': trend === 'down',
        }"
        :title="trendLabel"
      >
        {{ trend === 'up' ? '↑' : '↓' }}
      </span>
    </div>
    <p v-if="hint" class="mt-1.5 text-[13px] leading-snug text-stone-500">
      {{ hint }}
    </p>
  </div>
</template>
