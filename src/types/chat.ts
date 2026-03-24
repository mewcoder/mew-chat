export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatSettingsState {
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  useStream: boolean
}
