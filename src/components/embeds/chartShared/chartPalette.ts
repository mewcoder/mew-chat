/** 与聊天卡片搭配的固定调色盘（冷暖穿插、色弱相对友好） */
export const CHART_SERIES_COLORS = [
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#10b981',
  '#f97316',
  '#3b82f6',
] as const

export function chartTextColors(): {
  primary: string
  secondary: string
  border: string
  tooltipBg: string
} {
  return {
    primary: '#1c1917',
    secondary: '#78716c',
    border: '#d6d3d1',
    tooltipBg: 'rgba(255, 255, 255, 0.96)',
  }
}

export function baseChartOptionPartial(): {
  color: string[]
  textStyle: { color: string; fontFamily: string }
} {
  const t = chartTextColors()
  return {
    color: [...CHART_SERIES_COLORS],
    textStyle: {
      color: t.primary,
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  }
}
