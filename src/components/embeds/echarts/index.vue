<script setup lang="ts">
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    option: Record<string, unknown>
    title?: string
    height?: number
  }>(),
  { height: 320 },
)

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const chartHeight = computed(() => {
  const h = props.height
  if (typeof h === 'number' && h >= 120 && h <= 900) return h
  return 320
})

onMounted(() => {
  const el = chartEl.value
  if (!el) return
  chart = echarts.init(el)
  chart.setOption(props.option as echarts.EChartsCoreOption)
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(el)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})

watch(
  () => props.option,
  (opt) => {
    chart?.setOption(opt as echarts.EChartsCoreOption)
  },
  { deep: true },
)

watch(chartHeight, () => {
  chart?.resize()
})
</script>

<template>
  <div
    class="rounded-xl border border-stone-200/90 bg-[var(--surface-elevated)] p-3 shadow-ui-sm dark:border-stone-600 dark:bg-stone-900/80"
    role="region"
    :aria-label="title || '图表'"
  >
    <div
      v-if="title"
      class="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
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
