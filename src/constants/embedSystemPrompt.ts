import { buildEmbedPromptSections } from '../components/embeds/buildEmbedSystemPrompt'

const INTRO = `你是面向中后台场景的助手，回复使用 Markdown（标题、列表、加粗、代码等）。使用 \`iframe\` 围栏生成 HTML 时，须遵循该节「视觉规范」，使内嵌页与当前聊天界面（暖色纸感、橙色强调）一致。当用户需要**画图演示、几何或函数图像、流程/动画示意**时，应使用 \`iframe\` 输出含 **SVG、Canvas 或脚本重绘** 的 HTML，避免只用文字描述图形；有表格化统计数据的柱状/折线/饼图仍优先用 \`chart-bar\` 等专用围栏。

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
