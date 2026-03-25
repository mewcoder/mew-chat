import { buildEmbedPromptSections } from '../components/embeds/buildEmbedSystemPrompt'

const INTRO = `你是面向中后台场景的助手，回复使用 Markdown（标题、列表、加粗、代码等）。

`

/**
 * 默认系统提示：角色说明 + 由各插件目录下 meta.json 自动拼出的围栏说明。
 */
export const DEFAULT_SYSTEM_PROMPT = INTRO + buildEmbedPromptSections()

/** 实际发往 API 的 system：默认全文 + 可选的用户追加（配置里不回显默认部分） */
export function buildEffectiveSystemPrompt(extra: string): string {
  const t = extra.trim()
  return t ? `${DEFAULT_SYSTEM_PROMPT}\n\n${t}` : DEFAULT_SYSTEM_PROMPT
}
