<script setup lang="ts">
import { computed } from 'vue'

type Trend = 'up' | 'down' | 'neutral'

const props = defineProps<{
  items: {
    title: string
    value: string | number
    hint?: string
    trend?: Trend
  }[]
}>()

const safeItems = computed(() =>
  (props.items || []).filter((it) => it && typeof it.title === 'string'),
)

function trendLabel(t: Trend | undefined): string {
  if (t === 'up') return '上升'
  if (t === 'down') return '下降'
  return ''
}
</script>

<template>
  <div
    class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    role="region"
    aria-label="指标栅格"
  >
    <div
      v-for="(it, i) in safeItems"
      :key="i"
      class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] px-4 py-3 shadow-ui-sm"
      :aria-label="it.title"
    >
      <div class="text-xs font-medium uppercase tracking-wide text-stone-500">
        {{ it.title }}
      </div>
      <div class="mt-1 flex flex-wrap items-baseline gap-2">
        <span class="text-2xl font-semibold tabular-nums text-stone-900">
          {{ it.value }}
        </span>
        <span
          v-if="it.trend && it.trend !== 'neutral'"
          class="text-xs font-medium"
          :class="{
            'text-emerald-600': it.trend === 'up',
            'text-rose-600': it.trend === 'down',
          }"
          :title="trendLabel(it.trend)"
        >
          {{ it.trend === 'up' ? '↑' : '↓' }}
        </span>
      </div>
      <p v-if="it.hint" class="mt-1.5 text-[13px] leading-snug text-stone-500">
        {{ it.hint }}
      </p>
    </div>
  </div>
</template>
