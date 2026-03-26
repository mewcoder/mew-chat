<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  items: { time: string; title: string; detail?: string }[]
}>()

const list = computed(() =>
  (props.items || []).filter(
    (it) => it && typeof it.time === 'string' && typeof it.title === 'string',
  ),
)
</script>

<template>
  <div
    class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] shadow-ui-sm"
    role="region"
    :aria-label="title || '时间线'"
  >
    <div
      v-if="title"
      class="border-b border-stone-200/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-600"
    >
      {{ title }}
    </div>
    <ol class="relative py-2 pl-2">
      <li
        v-for="(it, i) in list"
        :key="i"
        class="relative flex gap-4 pb-6 pl-6 last:pb-2"
      >
        <div
          class="absolute left-[11px] top-2 flex h-full w-px flex-col items-center bg-stone-200"
          aria-hidden="true"
        >
          <span
            class="absolute -left-[3.5px] top-1.5 h-2 w-2 shrink-0 rounded-full border-2 border-stone-300 bg-[var(--surface-elevated)]"
          />
        </div>
        <div class="min-w-0 flex-1 pt-0.5">
          <div class="text-[11px] font-medium tabular-nums text-stone-500">
            {{ it.time }}
          </div>
          <div class="mt-0.5 text-[13px] font-semibold text-stone-900">
            {{ it.title }}
          </div>
          <p v-if="it.detail" class="mt-1 text-[13px] leading-snug text-stone-600">
            {{ it.detail }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
