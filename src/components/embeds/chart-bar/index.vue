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
    /** 纵轴名称，如「人次」「元」 */
    unit?: string
    horizontal?: boolean
  }>(),
  { height: 320, horizontal: false },
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
  const names = props.items.map((it) => it.name)
  const values = props.items.map((it) => it.value)
  const unit = props.unit?.trim() || ''

  const axisCommon = {
    axisLine: { lineStyle: { color: t.border } },
    axisLabel: { color: t.secondary, fontSize: 11 },
    splitLine: { lineStyle: { color: '#e7e5e4', type: 'dashed' as const } },
  }

  if (props.horizontal) {
    return {
      ...base,
      grid: { left: 12, right: unit ? 36 : 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: t.tooltipBg,
        borderColor: t.border,
        textStyle: { color: t.primary, fontSize: 12 },
      },
      xAxis: {
        type: 'value',
        ...axisCommon,
        name: unit,
        nameTextStyle: { color: t.secondary, fontSize: 11, padding: [0, 0, 0, 4] },
      },
      yAxis: {
        type: 'category',
        data: names,
        ...axisCommon,
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: values,
          barMaxWidth: 36,
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        },
      ],
    }
  }

  return {
    ...base,
    grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: t.tooltipBg,
      borderColor: t.border,
      textStyle: { color: t.primary, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: names,
      ...axisCommon,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      ...axisCommon,
      name: unit,
      nameTextStyle: { color: t.secondary, fontSize: 11, padding: [0, 0, 8, 0] },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: 40,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
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
    :aria-label="title || '柱状图'"
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
