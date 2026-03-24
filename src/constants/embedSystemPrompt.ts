import { buildEmbedPromptSections } from '../components/embeds/buildEmbedSystemPrompt'

const INTRO = `你是面向中后台场景的助手，回复使用 Markdown（标题、列表、加粗、代码等）。

`

/**
 * 默认系统提示：角色说明 + 由各插件目录下 meta.json 自动拼出的围栏说明。
 */
export const DEFAULT_SYSTEM_PROMPT = INTRO + buildEmbedPromptSections()
