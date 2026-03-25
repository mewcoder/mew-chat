/**
 * 流式 / 不完整 JSON → 可绑定组件的 props：优先依据各插件 meta.json 的 JSON Schema 自动补齐，
 * 新增围栏一般只需 `文件夹 + index.vue + meta.json`，无需改中央 switch。
 */

const ELLIPSIS = '\u2026'

function typesOf(t: unknown): string[] {
  if (t === undefined) return []
  if (Array.isArray(t)) return t.filter((x) => typeof x === 'string') as string[]
  if (typeof t === 'string') return [t]
  return []
}

function isArraySchema(s: Record<string, unknown>): boolean {
  return typesOf(s.type).includes('array')
}

function isObjectSchema(s: Record<string, unknown>): boolean {
  return typesOf(s.type).includes('object') && !!s.properties
}

function defaultScalar(s: Record<string, unknown>): unknown {
  if ('default' in s) return (s as { default: unknown }).default
  const enums = s.enum
  if (Array.isArray(enums) && enums.length > 0) return enums[0]

  for (const t of typesOf(s.type)) {
    if (t === 'string') return ELLIPSIS
    if (t === 'number' || t === 'integer') return 0
    if (t === 'boolean') return false
  }
  return ELLIPSIS
}

function placeholderRowFromItems(items: Record<string, unknown>): unknown {
  if (!isObjectSchema(items)) return {}
  const props = items.properties as Record<string, Record<string, unknown>>
  const req = (items.required as string[]) || []
  const row: Record<string, unknown> = {}
  for (const key of req) {
    const sub = props[key]
    if (sub) row[key] = defaultForSchema(sub)
  }
  return row
}

function defaultForSchema(s: Record<string, unknown>): unknown {
  if ('default' in s) return (s as { default: unknown }).default

  if (isArraySchema(s)) {
    const minItems = typeof s.minItems === 'number' ? s.minItems : 0
    const items = s.items as Record<string, unknown> | undefined
    const arr: unknown[] = []
    if (minItems > 0 && items) {
      for (let i = 0; i < minItems; i++) {
        arr.push(placeholderRowFromItems(items))
      }
    }
    return arr
  }

  if (isObjectSchema(s)) {
    return buildObjectPlaceholder(s)
  }

  return defaultScalar(s)
}

function buildObjectPlaceholder(schema: Record<string, unknown>): Record<string, unknown> {
  const props = schema.properties as Record<string, Record<string, unknown>>
  const req = new Set((schema.required as string[]) || [])
  const o: Record<string, unknown> = {}
  for (const key of Object.keys(props || {})) {
    if (!req.has(key)) continue
    o[key] = defaultForSchema(props[key])
  }
  return o
}

function fillObjectSchema(schema: Record<string, unknown>, obj: Record<string, unknown>): void {
  if (!isObjectSchema(schema)) return
  const props = schema.properties as Record<string, Record<string, unknown>>
  const required = new Set((schema.required as string[]) || [])

  for (const key of Object.keys(props || {})) {
    const sub = props[key]
    let v = obj[key]

    if (v === undefined && 'default' in sub) {
      obj[key] = (sub as { default: unknown }).default
      v = obj[key]
    }

    if (v === undefined && required.has(key)) {
      obj[key] = defaultForSchema(sub)
      v = obj[key]
    }

    if (v === undefined || v === null) continue

    if (isArraySchema(sub) && Array.isArray(v)) {
      const minItems = typeof sub.minItems === 'number' ? sub.minItems : 0
      const items = sub.items as Record<string, unknown> | undefined
      while (minItems > 0 && v.length < minItems && items) {
        v.push(placeholderRowFromItems(items))
      }
      if (items && isObjectSchema(items)) {
        const childObjSchema = {
          type: 'object',
          properties: items.properties,
          required: items.required,
        } as Record<string, unknown>
        for (const el of v) {
          if (el && typeof el === 'object' && !Array.isArray(el)) {
            fillObjectSchema(childObjSchema, el as Record<string, unknown>)
          }
        }
      }
      continue
    }

    if (isObjectSchema(sub) && typeof v === 'object' && !Array.isArray(v)) {
      fillObjectSchema(sub, v as Record<string, unknown>)
    }
  }
}

/**
 * 将 partial-json 解析后的对象按 Schema 补齐必填与 minItems，供流式渲染与占位。
 */
export function normalizePartialPropsFromSchema(
  schema: Record<string, unknown>,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...input }
  fillObjectSchema(schema, out)
  return out
}
