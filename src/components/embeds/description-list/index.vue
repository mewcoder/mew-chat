<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  items: { label: string; value: string | number | boolean }[]
}>()

const rows = computed(() =>
  (props.items || []).filter(
    (it) => it && typeof it.label === 'string' && it.value !== undefined && it.value !== null,
  ),
)

function displayValue(v: string | number | boolean): string {
  if (typeof v === 'boolean') return v ? '是' : '否'
  return String(v)
}
</script>

<template>
  <div
    class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] shadow-ui-sm"
    role="region"
    :aria-label="title || '描述列表'"
  >
    <div
      v-if="title"
      class="border-b border-stone-200/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-600"
    >
      {{ title }}
    </div>
    <dl class="grid gap-x-6 gap-y-0 sm:grid-cols-2">
      <div
        v-for="(it, i) in rows"
        :key="i"
        class="flex flex-col gap-0.5 border-b border-stone-100 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
      >
        <dt class="text-[11px] font-medium uppercase tracking-wide text-stone-500">
          {{ it.label }}
        </dt>
        <dd class="text-[13px] font-medium text-stone-900 break-words">
          {{ displayValue(it.value) }}
        </dd>
      </div>
    </dl>
  </div>
</template>
