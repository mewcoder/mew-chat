<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts'
import { computed, ref } from 'vue'
import { baseChartOptionPartial, chartTextColors } from '../chartShared/chartPalette'
import { useEchartsHost } from '../chartShared/useEchartsHost'
import type { ChartDatum } from '../chartShared/types'

const props = withDefaults(
  defineProps<{
    items: ChartDatum[]
    title?: string
    height?: number
    /** 环形内半径百分比，0 为实心饼 */
    donut?: boolean
  }>(),
  { height: 320, donut: false },
)

const chartEl = ref<HTMLDivElement | null>(null)

const chartHeight = computed(() => {
  const h = props.height
  if (typeof h === 'number' && h >= 120 && h <= 900) return h
  return 320
})

const option = computed<EChartsCoreOption>(() => {
  const t = chartTextColors()
  const base = baseChartOptionPartial()
  const data = props.items.map((it) => ({ name: it.name, value: it.value }))
  const radius = props.donut ? (['45%', '72%'] as const) : ('66%' as const)

  return {
    ...base,
    tooltip: {
      trigger: 'item',
      backgroundColor: t.tooltipBg,
      borderColor: t.border,
      textStyle: { color: t.primary, fontSize: 12 },
      formatter: '{b}<br/>{c} ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 4,
      left: 'center',
      textStyle: { color: t.secondary, fontSize: 11 },
      pageTextStyle: { color: t.secondary },
    },
    series: [
      {
        type: 'pie',
        radius,
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fafaf9',
          borderWidth: 2,
        },
        label: {
          color: t.secondary,
          fontSize: 11,
          formatter: '{b}\n{d}%',
        },
        labelLine: {
          lineStyle: { color: t.secondary },
        },
        data,
      },
    ],
  }
})

useEchartsHost(chartEl, () => option.value, [option, chartHeight])
</script>

<template>
  <div
    class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] p-3 shadow-ui-sm"
    role="region"
    :aria-label="title || '饼图'"
  >
    <div
      v-if="title"
      class="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500"
    >
      {{ title }}
    </div>
    <div
      ref="chartEl"
      class="w-full min-w-0"
      :style="{ height: `${chartHeight}px` }"
    />
  </div>
</template>
