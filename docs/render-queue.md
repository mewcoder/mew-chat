# 流式助手消息：渲染队列与展示链路

本文梳理 **SSE → 文本缓冲 → 消息状态 → Markdown/Embed 解析 → 组件渲染** 的完整逻辑，与 `src/utils/renderQueue.ts`、`src/composables/useChat.ts`、`src/utils/chatMarkdown.ts`、`ChatMessageRenderer.vue` 的实现保持一致。

---

## 1. 全链路数据流

```
OpenAI 兼容 SSE（fetch + ReadableStream）
    │
    ▼  onTextDelta(字符串片段)
createRenderQueue 的 buffer（积压）
    │
    ▼  requestAnimationFrame → renderFrame
    │     • 按「自适应步长」决定本帧准备出队长度 rawCut
    │     • clampChunkCutToFenceLines → 实际切口 cut（围栏行不断在中间）
    │
    ▼  onAppend(chunk)  →  useChat：assistant.content += chunk
    │
    ▼  Vue 响应式更新
ChatMessageRenderer：computed(parseChatMarkdown(content))
    │
    ▼  ChatSegment[]：html 段落 + embed 段落
模板：v-html（经 sanitize）+ 动态组件
```

**要点**：

- 网络层多快都可以；**写进 `content` 的节奏**由 RenderQueue 限制，从而限制 `parseChatMarkdown` 的触发频率，减轻主线程与 DOM 压力。
- **围栏行保护**与 **分段 stable key** 配合，减少「普通代码块闪成 embed」和整段 `v-html` 销毁重建。

---

## 2. 要解决的问题

| 现象 | 原因 |
|------|------|
| 卡顿、掉帧 | 每个 SSE chunk 都触发一次完整渲染链 |
| 黑底 `pre` 闪一下 | 切口落在 \`\`\` 分隔行中间时，一度按「普通 fence → `<pre><code>`」解析，闭合后又变成 embed |
| embed 区域抖动 | 若按 `content.length` 等做 `:key`，流式每字变更都会导致片段 key 变化 |

---

## 3. 涉及文件与职责

| 路径 | 职责 |
|------|------|
| `src/utils/renderQueue.ts` | 缓冲、rAF 出队、围栏切口夹紧、`withRenderQueue` |
| `src/composables/useChat.ts` | SSE 请求、`createRenderQueue` + `withRenderQueue`、中止、`dispose` |
| `src/utils/chatMarkdown.ts` | `parseChatMarkdown`（md token → 片段）、`sanitizeChatHtml` |
| `src/components/ChatMessageRenderer.vue` | 对 `content` 分段渲染、片段 key 策略 |

---

## 4. RenderQueue 行为说明

### 4.1 自适应出队步长（网络未结束）

当前实现：`buffer.length` 越大，本帧 **raw** 出队字符数越大（先有上限，再经围栏夹紧）。

| 积压长度 | 本帧 raw 上限（字符） |
|----------|------------------------|
| > 2000 | 320 |
| > 400 | 96 |
| > 80 | 28 |
| ≤ 80 | 10 |

**设计意图**：积压多 → 加快追上网络；积压少 → 视觉更平滑。

### 4.2 网络已结束（`complete()` 之后）

- `networkDone === true` 时，单帧 raw 上限为 `min(buffer.length, 4096)`（常量 `DRAIN_CHUNK_CAP`），尽快排空。
- 仍经过 **`clampChunkCutToFenceLines`**：除非进入收尾兜底分支，否则不在围栏分隔行中间切开。

### 4.3 围栏行夹紧 `clampChunkCutToFenceLines`

- **匹配行**：与 CommonMark 一致，行首至多 3 个空格/制表符，随后为 **```** 的行视为围栏分隔行（开场或收场都包括）。
- **规则**：
  - 若切口落在某围栏分隔行 **内部**（未到行尾换行），则把切口 **降到该行行首**，该行整行留在 buffer，下帧再出。
  - 若文本 **最后一行** 是围栏行且 **文末没有换行**（行尚不完整），则任何切口若深入该行，同样 **降到该行行首**，避免半行 \`\`\`xxx 被提交给解析器。
- **实现**：对 `buffer` 做 **单次线性扫描**（按 `\n` 与 EOF 断行），避免每帧 `split('\n')` 整表分配。

导出便于调试：`getIncompleteFenceLineLength(text)`（等价于「全文安全前缀」之外的后缀长度）。

### 4.4 切口为 0 时的收尾

若夹紧后 `cut <= 0`：

- **若** `networkDone && buffer.length > 0`：**一次性** `cut = buffer.length`（流已结束，不再等待下一帧补全围栏语义）。
- **否则**：本帧不出队，仅 `schedule()` 下一帧（等待更多输入或网络结束）。

### 4.5 调度与状态

- **调度**：`push` / `complete` / `waitForIdle` 注册等待时，若尚无待执行 rAF，则 `requestAnimationFrame(renderFrame)`。
- **内部状态**：`buffer`、`rafId`、`networkDone`、`idleResolver`（`waitForIdle` 的 Promise）。

### 4.6 API 小结

| 方法 | 作用 |
|------|------|
| `push(chunk)` | 追加缓冲并调度 |
| `complete()` | 标记 SSE 正常结束，继续排空 |
| `waitForIdle()` | Promise：在「已 complete 且 buffer 空」时 resolve |
| `dispose()` | `cancelAnimationFrame`；若有剩余 `buffer` 一次性 `onAppend`；`networkDone = true`；若有 `idleResolver` 则 resolve（便于清理等待） |

### 4.7 `withRenderQueue(queue, work)`

标准成功/失败模板：

- `try { await work(); queue.complete(); await queue.waitForIdle() }`
- `catch { queue.dispose(); throw err }`

成功路径不额外 `dispose`（缓冲已空、rAF 无需保留）。失败路径必须 `dispose`，避免悬挂 rAF 与未消费的 buffer。

---

## 5. useChat 中的衔接与生命周期

1. `sendMessage`：追加 user 与空 `assistant`，创建 `AbortController`，`streaming = true`。
2. `createRenderQueue((chunk) => appendToAssistantAt(...))`，并挂到 `activeRenderQueue`（供 `stop()` 使用）。
3. `await withRenderQueue(renderQueue, () => requestChatCompletion({ ..., onTextDelta: (c) => renderQueue.push(c) }))`。
4. `catch`：`setAssistantErrorAt`（`withRenderQueue` 已 `dispose`）。
5. `finally`：`activeRenderQueue = null`，`streaming = false`，`abortController = null`。

**用户中止 `stop()`**：`activeRenderQueue?.dispose()`，再 `abort()`，与错误路径一样会尽量把已缓冲正文刷进气泡。

---

## 6. chatMarkdown 与 ChatMessageRenderer

- **`parseChatMarkdown(src)`**：`markdown-it` 解析后，普通 token 渲染为一段 HTML；语言在 `embedFenceLangs` 内的 fence 拆成 `type: 'embed'`，交给 `embedRegistry`。
- **`sanitizeChatHtml`**：DOMPurify 白名单，供 `v-html` 使用。
- **片段 key**（`segmentKey`）：HTML 段用 **`h-${index}`**，embed 段用 **`e-${index}-${seg.name}`**，**故意不与 `content.length` 绑定**，避免流式更新时整段 DOM 重建闪动。

RenderQueue 降低更新频率 + 围栏不断行 + 稳定 segment key，三者共同减轻闪屏。

---

## 7. 使用示例（独立复用队列时）

```typescript
import { createRenderQueue, withRenderQueue } from '../utils/renderQueue'

const renderQueue = createRenderQueue((chunk) => {
  messageContent += chunk
})

await withRenderQueue(renderQueue, async () => {
  // 在 work 内收到流数据时：
  renderQueue.push(delta)
  // work 正常结束后会自动 complete + waitForIdle
})

// 用户中止或组件卸载：
renderQueue.dispose()
```

---

## 8. 为何使用 requestAnimationFrame

- 与显示刷新对齐，避免盲目超高频定时器。
- 标签页在后台时浏览器会节流，省资源。
- 出队逻辑放在每帧回调中，保证「每帧最多处理一轮」的可预期负载。
