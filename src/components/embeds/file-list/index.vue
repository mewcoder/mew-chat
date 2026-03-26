<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const props = defineProps<{
  title?: string
  items: { name: string; meta?: string; tone?: Tone }[]
}>()

const rows = computed(() =>
  (props.items || []).filter((it) => it && typeof it.name === 'string'),
)

function barClass(tone: Tone | undefined): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-500'
    case 'warning':
      return 'bg-amber-500'
    case 'danger':
      return 'bg-rose-500'
    case 'info':
      return 'bg-sky-500'
    default:
      return 'bg-stone-300'
  }
}
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] shadow-ui-sm"
    role="region"
    :aria-label="title || '文件列表'"
  >
    <div
      v-if="title"
      class="border-b border-stone-200/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-600"
    >
      {{ title }}
    </div>
    <ul class="divide-y divide-stone-100">
      <li
        v-for="(it, i) in rows"
        :key="i"
        class="flex gap-3 px-3 py-2.5 sm:px-4"
      >
        <div
          class="w-1 shrink-0 self-stretch rounded-full"
          :class="barClass(it.tone)"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <div class="text-[13px] font-medium text-stone-900 break-words">
            {{ it.name }}
          </div>
          <div v-if="it.meta" class="mt-0.5 text-[12px] text-stone-500">
            {{ it.meta }}
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
