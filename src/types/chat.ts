export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatSettingsState {
  baseUrl: string
  apiKey: string
  model: string
  /** 仅用户追加片段；与内置默认合并后写入 API system。 */
  systemPromptExtra: string
}
