import Ajv, { type ValidateFunction } from 'ajv'
import { Allow, parse as parsePartialJson } from 'partial-json'
import type { EmbedMeta } from './embedMeta'

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  coerceTypes: true,
})

/** Ajv 未加载 draft meta-schema 时，`$schema` 会导致 compile 抛错；围栏校验不需要该字段 */
function schemaForAjv(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema: _s, ...rest } = schema
  return rest
}

export function compileEmbedValidators(
  metas: Iterable<EmbedMeta>,
): Map<string, ValidateFunction> {
  const map = new Map<string, ValidateFunction>()
  for (const meta of metas) {
    if (!meta.schema || typeof meta.schema !== 'object') {
      console.warn(`[embeds] ${meta.id} 缺少 schema`)
      continue
    }
    try {
      map.set(meta.id, ajv.compile(schemaForAjv(meta.schema)))
    } catch (e) {
      console.warn(`[embeds] ${meta.id} JSON Schema 编译失败`, e)
    }
  }
  return map
}

/**
 * 解析围栏内 JSON，并按对应插件的 JSON Schema 校验；不通过则返回 null。
 */
export function parseEmbedBodyValidated(
  id: string,
  body: string,
  validators: Map<string, ValidateFunction>,
): Record<string, unknown> | null {
  const raw = body.trim()
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const validate = validators.get(id)
  if (!validate) return null
  const copy = JSON.parse(JSON.stringify(data)) as Record<string, unknown>
  if (validate(copy)) {
    return copy
  }
  return null
}

function normalizePartialKpi(o: Record<string, unknown>): Record<string, unknown> {
  const title =
    typeof o.title === 'string'
      ? o.title
      : o.title !== undefined && o.title !== null
        ? String(o.title)
        : '\u2026'
  const value =
    typeof o.value === 'string' || typeof o.value === 'number'
      ? o.value
      : o.value !== undefined && o.value !== null
        ? String(o.value)
        : '\u2026'
  const hint = typeof o.hint === 'string' ? o.hint : undefined
  const trend =
    o.trend === 'up' || o.trend === 'down' || o.trend === 'neutral' ? o.trend : undefined
  const out: Record<string, unknown> = { title, value }
  if (hint !== undefined) out.hint = hint
  if (trend !== undefined) out.trend = trend
  return out
}

function normalizePartialAlert(o: Record<string, unknown>): Record<string, unknown> {
  const message = typeof o.message === 'string' ? o.message : '\u2026'
  const title = typeof o.title === 'string' ? o.title : undefined
  const variant =
    o.variant === 'info' ||
    o.variant === 'success' ||
    o.variant === 'warning' ||
    o.variant === 'error'
      ? o.variant
      : undefined
  const out: Record<string, unknown> = { message }
  if (title !== undefined) out.title = title
  if (variant !== undefined) out.variant = variant
  return out
}

function normalizePartialDataTable(o: Record<string, unknown>): Record<string, unknown> {
  type Col = { key: string; label: string }
  const columns: Col[] = []
  const rawCols = o.columns
  if (Array.isArray(rawCols)) {
    for (const c of rawCols) {
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const row = c as Record<string, unknown>
        if (typeof row.key === 'string' && typeof row.label === 'string') {
          columns.push({ key: row.key, label: row.label })
        }
      }
    }
  }
  if (columns.length === 0) {
    columns.push({ key: '_', label: '\u2026' })
  }
  const rows: Record<string, unknown>[] = []
  const rawRows = o.rows
  if (Array.isArray(rawRows)) {
    for (const r of rawRows) {
      if (r && typeof r === 'object' && !Array.isArray(r)) {
        rows.push(r as Record<string, unknown>)
      }
    }
  }
  return { columns, rows }
}

function normalizePartialEcharts(o: Record<string, unknown>): Record<string, unknown> {
  const title = typeof o.title === 'string' ? o.title : undefined
  let height: number | undefined
  if (typeof o.height === 'number' && o.height >= 120 && o.height <= 900) {
    height = o.height
  }
  let option: Record<string, unknown> = {}
  if (o.option && typeof o.option === 'object' && !Array.isArray(o.option)) {
    try {
      option = JSON.parse(JSON.stringify(o.option)) as Record<string, unknown>
    } catch {
      option = {}
    }
  }
  if (Object.keys(option).length === 0) {
    option = {
      title: {
        text: '\u2026',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#a8a29e', fontSize: 14 },
      },
      xAxis: { type: 'category', show: false, data: [] },
      yAxis: { type: 'value', show: false },
      series: [],
    }
  }
  const out: Record<string, unknown> = { option }
  if (title !== undefined) out.title = title
  if (height !== undefined) out.height = height
  return out
}

function normalizePartialEmbedProps(
  id: string,
  o: Record<string, unknown>,
): Record<string, unknown> | null {
  switch (id) {
    case 'kpi':
      return normalizePartialKpi(o)
    case 'alert':
      return normalizePartialAlert(o)
    case 'data-table':
      return normalizePartialDataTable(o)
    case 'echarts':
      return normalizePartialEcharts(o)
    default:
      return null
  }
}

/** 围栏体尚为空或无法走 partial-json 时，与各插件流式占位一致的 props */
export function streamEmbedPlaceholderProps(
  id: string,
): { props: Record<string, unknown>; partial: boolean } | null {
  const p = normalizePartialEmbedProps(id, {})
  if (!p) return null
  return { props: p, partial: true }
}

/**
 * 先尝试完整 JSON + Schema；失败则用 partial-json 解析流式片段并规范为可绑定的 props。
 * 若规范结果已满足 Schema，则视为完整（partial: false）。
 */
export function parseEmbedForStream(
  id: string,
  body: string,
  validators: Map<string, ValidateFunction>,
): { props: Record<string, unknown>; partial: boolean } | null {
  const trimmed = body.trim()
  if (!trimmed) {
    return streamEmbedPlaceholderProps(id)
  }

  const full = parseEmbedBodyValidated(id, body, validators)
  if (full) {
    return { props: full, partial: false }
  }

  let data: unknown
  try {
    data = parsePartialJson(trimmed, Allow.ALL)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const normalized = normalizePartialEmbedProps(id, data as Record<string, unknown>)
  if (!normalized) return null

  const validate = validators.get(id)
  if (validate) {
    const copy = JSON.parse(JSON.stringify(normalized)) as Record<string, unknown>
    if (validate(copy)) {
      return { props: copy, partial: false }
    }
  }

  return { props: normalized, partial: true }
}
