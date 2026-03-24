/**
 * 与每个插件目录下 meta.json 对应的类型。
 * 组件入参由 JSON Schema 描述，并与围栏内 JSON、Ajv 校验一致。
 */
export interface EmbedMeta {
  /** 围栏第一行的语言名（建议与插件目录名一致） */
  id: string
  /** 在系统提示里展示顺序，数字越小越靠前 */
  order?: number
  /** 小节标题（中文） */
  title: string
  /** 一句话适用场景 */
  summary: string
  /**
   * JSON Schema（建议 draft-07 / 2020-12），根节点为 object，
   * 描述围栏内 JSON 对象结构；与 index.vue 的 props 一致。
   */
  schema: Record<string, unknown>
  /** 可选：写入系统提示的完整围栏示例（应能通过 schema 校验） */
  example?: Record<string, unknown> | unknown[]
  /** 参与「何时用围栏」汇总的一条规则 */
  routingHint?: string
}
