# 围栏插件（Embeds）说明

助手消息里的 Markdown 代码围栏（如 ` ```kpi `）会被解析为 JSON，校验通过后渲染为 Vue 组件。新增一种展示形态时，在 `src/components/embeds/` 下**增加一个子文件夹即可**，无需改 `embedRegistry.ts` 或中央 `switch`。

## 目录约定

每个插件一个文件夹，至少包含：

| 文件 | 作用 |
|------|------|
| `meta.json` | 围栏语言名 `id`、排序 `order`、给模型的 `summary` / `routingHint`、**JSON Schema**（与组件 props 一致） |
| `index.vue` | 默认导出组件，`defineProps` 与 `meta.json` 的 `schema` 对齐 |

可选：

| 文件 | 作用 |
|------|------|
| `streamNormalize.ts` | 导出 `normalizePartialStreamProps(o)`，在**流式输出**且 JSON 不完整时，覆盖「按 Schema 自动补齐」的默认行为 |

## 自动扫描（无需登记名录）

- **组件注册**：`embedRegistry.ts` 通过 `import.meta.glob('./*/index.vue')` 加载，并与同目录 `meta.json` 配对。
- **系统提示**：`buildEmbedSystemPrompt.ts` 通过 `import.meta.glob('./*/meta.json')` 生成围栏说明给模型。
- **流式占位 / partial JSON**：`embedValidation.ts` 先查是否存在 `streamNormalize.ts`；否则用 `embedPartialFromSchema.ts` 根据 **schema** 补齐必填项、`minItems`，以及带 **`default`** 的可选字段。

## `meta.json` 要点

- **`id`**：围栏第一行的语言名，须与模型输出一致（建议与文件夹名相同）。
- **`schema`**：根节点为 `object`，建议 `additionalProperties: false`。与 `index.vue` 的 props 一一对应，供 Ajv 校验完整 JSON。
- **流式体验**：必填数组若写了 `minItems`（如图表的 `items`），不完整时也会自动塞占位元素；可选布尔/数字等若希望「未写出栏也有合理默认」，可在对应属性上写 JSON Schema 的 **`default`**。

## `streamNormalize.ts`（可选）

当 Schema 不足以描述「边生成边渲染」的规整逻辑时，在同目录增加：

```ts
import type { /* … */ } from 'vue'

export function normalizePartialStreamProps(
  o: Record<string, unknown>,
): Record<string, unknown> {
  // 返回合并/补齐后的 props，供流式阶段绑定到组件
  return { ... }
}
```

导出函数名须为 **`normalizePartialStreamProps`**。

## 参考现有插件

`kpi`、`data-table`、`chart-pie`、`chart-bar`、`chart-line` 等子目录即为完整示例；复杂表格与图表均以 Schema + 默认补齐为主，未单独使用 `streamNormalize.ts`。
