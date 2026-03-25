import Ajv, { type ValidateFunction } from 'ajv'
import { Allow, parse as parsePartialJson } from 'partial-json'
import type { EmbedMeta } from './embedMeta'
import { getMetaByPluginDir } from './buildEmbedSystemPrompt'
import { normalizePartialPropsFromSchema } from './embedPartialFromSchema'

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

type StreamNormFn = (o: Record<string, unknown>) => Record<string, unknown>

/** 可选：某插件目录下 `streamNormalize.ts` 导出 `normalizePartialStreamProps`，覆盖 Schema 自动补齐 */
const customStreamModules = import.meta.glob<{ normalizePartialStreamProps?: StreamNormFn }>(
  './*/streamNormalize.ts',
  { eager: true },
)

function buildCustomStreamNormalizers(): Map<string, StreamNormFn> {
  const metaByDir = getMetaByPluginDir()
  const m = new Map<string, StreamNormFn>()
  for (const path of Object.keys(customStreamModules)) {
    const dir = path.match(/^\.\/([^/]+)\/streamNormalize\.ts$/i)?.[1]
    if (!dir) continue
    const meta = metaByDir.get(dir)
    if (!meta) continue
    const fn = customStreamModules[path].normalizePartialStreamProps
    if (typeof fn === 'function') {
      m.set(meta.id, fn)
    }
  }
  return m
}

const customStreamNormalizers = buildCustomStreamNormalizers()

function getSchemaByEmbedId(id: string): Record<string, unknown> | undefined {
  for (const meta of getMetaByPluginDir().values()) {
    if (meta.id === id) return meta.schema
  }
  return undefined
}

function normalizePartialEmbedProps(
  id: string,
  o: Record<string, unknown>,
): Record<string, unknown> | null {
  const custom = customStreamNormalizers.get(id)
  if (custom) return custom(o)
  const schema = getSchemaByEmbedId(id)
  if (!schema) return null
  return normalizePartialPropsFromSchema(schema, o)
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
