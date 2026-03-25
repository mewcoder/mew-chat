/**
 * 插件约定（新建子文件夹即可，无需改本文件或 embedValidation 的 switch）：
 * - `你的插件/index.vue`：默认导出组件，props 与 meta.json 的 schema 一致
 * - `你的插件/meta.json`：id / title / schema / …（见 EmbedMeta）
 * - 可选 `你的插件/streamNormalize.ts`：导出 `normalizePartialStreamProps`，覆盖流式场景的 Schema 自动补齐
 */
import type { Component } from 'vue'
import type { EmbedMeta } from './embedMeta'
import { getMetaByPluginDir } from './buildEmbedSystemPrompt'
import {
  compileEmbedValidators,
  parseEmbedForStream,
  streamEmbedPlaceholderProps,
} from './embedValidation'

const vueModules = import.meta.glob('./*/index.vue', { eager: true }) as Record<
  string,
  { default: Component }
>

const embedMap: Record<string, Component> = {}

const metaByDir = getMetaByPluginDir()
const validators = compileEmbedValidators(metaByDir.values())

for (const vuePath of Object.keys(vueModules)) {
  const dir = vuePath.match(/^\.\/([^/]+)\/index\.vue$/i)?.[1]
  if (!dir) continue
  const meta = metaByDir.get(dir) as EmbedMeta | undefined
  if (!meta) {
    console.warn(`[embeds] 跳过 ${vuePath}：同目录缺少 meta.json`)
    continue
  }
  const id = typeof meta.id === 'string' ? meta.id.trim() : ''
  if (!id) {
    console.warn(`[embeds] 跳过 ${vuePath}：JSON 中 id 为空`)
    continue
  }
  const mod = vueModules[vuePath]
  if (!mod?.default) {
    console.warn(`[embeds] 跳过 ${vuePath}：缺少 default 导出`)
    continue
  }
  if (embedMap[id]) {
    console.warn(`[embeds] id "${id}" 重复，后加载的覆盖：${vuePath}`)
  }
  embedMap[id] = mod.default
}

/** 围栏第一行的语言名集合，与各插件 meta.json 中 id 一致 */
export const embedFenceLangs = new Set(Object.keys(embedMap))

export { embedMap }

/** 解析围栏 JSON；流式场景下 partial-json 可渐进得到 props */
export function parseEmbedFence(
  lang: string,
  body: string,
): { name: string; props: Record<string, unknown>; partial?: boolean } | null {
  if (!embedFenceLangs.has(lang)) return null
  const out = parseEmbedForStream(lang, body, validators)
  if (out) return { name: lang, props: out.props, partial: out.partial }
  const fb = streamEmbedPlaceholderProps(lang)
  if (fb) return { name: lang, props: fb.props, partial: true }
  return { name: lang, props: {}, partial: true }
}
