<script setup lang="ts">
import { computed } from 'vue'

export type Column = { key: string; label: string }

const props = defineProps<{
  columns: Column[]
  rows: Record<string, unknown>[]
}>()

const safeColumns = computed(() =>
  props.columns.filter((c) => typeof c.key === 'string' && typeof c.label === 'string'),
)

function cellText(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  try {
    return JSON.stringify(v)
  } catch {
    return '—'
  }
}
</script>

<template>
  <div
    class="overflow-x-auto rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] shadow-ui-sm dark:border-stone-600 dark:bg-stone-900/80"
    role="region"
    aria-label="数据表"
  >
    <table class="w-full min-w-[16rem] border-collapse text-left text-[13px]">
      <thead>
        <tr class="border-b border-stone-200/90 dark:border-stone-600">
          <th
            v-for="col in safeColumns"
            :key="col.key"
            scope="col"
            class="whitespace-nowrap px-3 py-2 font-semibold text-stone-700 dark:text-stone-200"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, ri) in rows"
          :key="ri"
          class="border-b border-stone-100 last:border-0 dark:border-stone-700/80"
        >
          <td
            v-for="col in safeColumns"
            :key="col.key"
            class="max-w-[20rem] px-3 py-2 align-top text-stone-800 dark:text-stone-200"
          >
            <span class="break-words">{{ cellText(row, col.key) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
