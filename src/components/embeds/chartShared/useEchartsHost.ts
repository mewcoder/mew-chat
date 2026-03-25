import * as echarts from 'echarts'
import type { EChartsCoreOption } from 'echarts'
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

export function useEchartsHost(
  chartEl: Ref<HTMLDivElement | null>,
  getOption: () => EChartsCoreOption,
  extraWatchSources: ReadonlyArray<Ref<unknown>> = [],
): void {
  let chart: echarts.ECharts | null = null
  let resizeObserver: ResizeObserver | null = null

  function apply(): void {
    chart?.setOption(getOption(), true)
  }

  onMounted(() => {
    const el = chartEl.value
    if (!el) return
    chart = echarts.init(el)
    apply()
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
    () => extraWatchSources.map((r) => r.value),
    () => {
      apply()
    },
    { deep: true },
  )
}
