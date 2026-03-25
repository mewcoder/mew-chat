<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts'
import { computed, ref } from 'vue'
import {
  baseChartOptionPartial,
  chartTextColors,
  CHART_SERIES_COLORS,
} from '../chartShared/chartPalette'
import { useEchartsHost } from '../chartShared/useEchartsHost'
import type { ChartDatum } from '../chartShared/types'

const props = withDefaults(
  defineProps<{
    items: ChartDatum[]
    title?: string
    height?: number
    /** 纵轴名称，如「人次」「元」 */
    unit?: string
    /** 平滑曲线，默认 true */
    smooth?: boolean
    /** 面积填充（浅色），默认 false */
    area?: boolean
  }>(),
  { height: 320, smooth: true, area: false },
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
  const lineColor = CHART_SERIES_COLORS[0]

  const axisCommon = {
    axisLine: { lineStyle: { color: t.border } },
    axisLabel: { color: t.secondary, fontSize: 11 },
    splitLine: { lineStyle: { color: '#e7e5e4', type: 'dashed' as const } },
  }

  const area = props.area
    ? {
        color: hexAlpha(lineColor, 0.14),
      }
    : undefined

  return {
    ...base,
    grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: t.border, width: 1, type: 'dashed' as const },
      },
      backgroundColor: t.tooltipBg,
      borderColor: t.border,
      textStyle: { color: t.primary, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: names,
      boundaryGap: false,
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
        type: 'line',
        data: values,
        smooth: props.smooth,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: names.length <= 24,
        lineStyle: { width: 2 },
        itemStyle: { borderWidth: 2, borderColor: '#fff' },
        areaStyle: area,
      },
    ],
  }
})

function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

useEchartsHost(chartEl, () => option.value, [option, chartHeight])
</script>

<template>
  <div
    class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] p-3 shadow-ui-sm"
    role="region"
    :aria-label="title || '折线图'"
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
