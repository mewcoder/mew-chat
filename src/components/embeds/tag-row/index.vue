<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const props = defineProps<{
  label?: string
  items: { text: string; tone?: Tone }[]
}>()

const list = computed(() =>
  (props.items || []).filter((it) => it && typeof it.text === 'string' && it.text.length > 0),
)

function toneClass(tone: Tone | undefined): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-800'
    case 'warning':
      return 'border-amber-200/80 bg-amber-50 text-amber-900'
    case 'danger':
      return 'border-rose-200/80 bg-rose-50 text-rose-800'
    case 'info':
      return 'border-sky-200/80 bg-sky-50 text-sky-900'
    default:
      return 'border-stone-200/90 bg-stone-50 text-stone-700'
  }
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] px-3 py-2.5 shadow-ui-sm"
    role="region"
    aria-label="状态标签"
  >
    <span
      v-if="label"
      class="mr-1 text-[11px] font-medium uppercase tracking-wide text-stone-500"
    >
      {{ label }}
    </span>
    <span
      v-for="(it, i) in list"
      :key="i"
      class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
      :class="toneClass(it.tone)"
    >
      {{ it.text }}
    </span>
  </div>
</template>
