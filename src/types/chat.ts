export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

/** 显示名可自定义；modelId 为唯一键及 API 请求中的模型标识 */
export interface ModelPreset {
  name: string
  modelId: string
}

export interface ChatSettingsState {
  baseUrl: string
  apiKey: string
  models: ModelPreset[]
  /** 当前选中的 modelId */
  currentModelId: string
}
