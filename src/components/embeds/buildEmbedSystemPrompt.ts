import type { EmbedMeta } from './embedMeta'

const jsonModules = import.meta.glob('./*/meta.json', {
  eager: true,
  import: 'default',
}) as Record<string, EmbedMeta>

/** 插件目录名（如 kpi、data-table）→ meta，与同目录 index.vue 配对 */
export function getMetaByPluginDir(): Map<string, EmbedMeta> {
  const m = new Map<string, EmbedMeta>()
  for (const path of Object.keys(jsonModules)) {
    const dir = path.match(/^\.\/([^/]+)\/meta\.json$/i)?.[1]
    if (!dir) continue
    const meta = jsonModules[path]
    if (!meta?.id || !meta.title || !meta.schema) {
      console.warn(`[embeds] 跳过无效 meta：${path}（需 id、title、schema）`)
      continue
    }
    m.set(dir, meta)
  }
  return m
}

export function loadEmbedMetas(): EmbedMeta[] {
  return [...getMetaByPluginDir().values()].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  )
}

export function formatFenceExample(
  id: string,
  example: EmbedMeta['example'],
): string {
  if (example === undefined) return ''
  const body = JSON.stringify(example, null, 2)
  return '```' + id + '\n' + body + '\n```'
}

function formatSchemaBlock(schema: Record<string, unknown>): string {
  return [
    '**参数 JSON Schema**（围栏内对象须满足）：',
    '```json',
    JSON.stringify(schema, null, 2),
    '```',
  ].join('\n')
}

/** 由各插件目录下 meta.json 拼出「自定义围栏」说明（不含开头角色设定段落） */
export function buildEmbedPromptSections(): string {
  const metas = loadEmbedMetas()
  if (metas.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push(
    `当用户需要结构化展示时，除普通文字外，可在正文中使用下面 **${metas.length}** 种**围栏**。围栏第一行的语言名必须**完全一致**，围栏内为**满足对应 JSON Schema 的 JSON**，前端校验通过后渲染为组件。`,
    '',
  )

  metas.forEach((meta, index) => {
    const n = index + 1
    lines.push(`## ${n}. ${meta.title} \`${meta.id}\``)
    lines.push(meta.summary)
    lines.push(formatSchemaBlock(meta.schema))
    if (meta.example !== undefined) {
      lines.push('')
      lines.push('**示例：**')
      lines.push(formatFenceExample(meta.id, meta.example))
    }
    lines.push('')
  })

  lines.push('## 何时用围栏')
  const hints = metas.map((m) => m.routingHint).filter(Boolean) as string[]
  for (const h of hints) {
    lines.push(`- ${h}`)
  }
  lines.push(
    '- 纯解释、步骤、分析，无结构化展示需求时，只用 Markdown 即可，不必强行加围栏。',
  )

  return lines.join('\n')
}
