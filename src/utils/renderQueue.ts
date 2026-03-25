/**
 * 流式消息渲染队列
 *
 * 核心职责：
 * 1. 接收 SSE 流式数据（网络快于 UI）
 * 2. 按可控节奏出队到界面，避免 DOM 压力
 * 3. 围栏行保护：任意 ``` 分隔行（开场或收场）不得被前缀出队从中间切断，否则 Markdown
 *    会短暂解析成普通代码块再变组件，出现「黑底 pre 闪一下」
 *
 * 自适应模式：积压多则出队快，积压少则出队慢
 */

// ============ 围栏代码块检测 ============

/** 与 Markdown 围栏行一致：至多 3 格缩进后以 ``` 开头 */
export const FENCE_DELIMITER_LINE = /^[ \t]{0,3}```/

/**
 * 将「打算出队的前缀长度」向下夹紧，使切口永远不会落在某一 ``` 分隔行（含该行尾换行）的中间。
 * 例如 desiredCut=10 且落在 ` ```js\n` 内部时，会降为该行之前的 lineStart。
 *
 * 单次线性扫描，避免对大 buffer 每帧 split 出整行数组。
 */
export function clampChunkCutToFenceLines(text: string, desiredCut: number): number {
  if (!text || desiredCut <= 0) return desiredCut

  let c = Math.min(desiredCut, text.length)
  const n = text.length
  const endsWithNewline = n > 0 && text[n - 1] === '\n'
  let lineStart = 0

  for (let i = 0; i <= n; i++) {
    const atEof = i === n
    if (!atEof && text[i] !== '\n') continue

    const line = text.slice(lineStart, i)
    if (FENCE_DELIMITER_LINE.test(line)) {
      const isLastLine = atEof
      if (isLastLine && !endsWithNewline) {
        if (c > lineStart) c = lineStart
      } else {
        const lineEnd = lineStart + line.length + 1
        if (c > lineStart && c < lineEnd) c = lineStart
      }
    }
    lineStart = i + 1
  }

  return c
}

/** @returns 本轮结束后缀应保留长度（兼容旧名 / 外部调试） */
export function getIncompleteFenceLineLength(text: string): number {
  if (!text) return 0
  const safe = clampChunkCutToFenceLines(text, text.length)
  return text.length - safe
}

// ============ 队列接口 ============

export interface RenderQueue {
  /** 接收新数据块 */
  push(chunk: string): void
  /** 网络流结束 */
  complete(): void
  /** 等待队列排空 */
  waitForIdle(): Promise<void>
  /** 强制刷新并清理 */
  dispose(): void
}

/** 网络结束时单次出队上限（尽快排空，仍受围栏夹紧约束） */
const DRAIN_CHUNK_CAP = 4096

const CHARS_BASE = 8
const LOG_SCALE = 25
const MAX_CHARS_PER_FRAME = 300

/** 积压长度 → 本帧 raw 出队字符数（网络未结束时）
 * 
 * 策略：使用对数曲线平滑加速
 * - 积压少时慢速打字效果自然
 * - 积压多时自动加速避免长时间卡顿
 * - 有上限防止瞬时渲染过重
 * 
 * 公式：base + log2(len + 1) * scale
 * - len=0 时返回 8 字符/帧
 * - len=2000 时约 8 + log2(2001)*25 ≈ 8 + 11*25 ≈ 283 字符/帧
 */
function chunkSizeForBufferLen(len: number, networkDone: boolean): number {
  if (networkDone) return Math.min(len, DRAIN_CHUNK_CAP)

  const raw = CHARS_BASE + Math.log2(len + 1) * LOG_SCALE
  return Math.min(Math.round(raw), MAX_CHARS_PER_FRAME)
}

// ============ 实现 ============

export function createRenderQueue(
  onAppend: (chunk: string) => void,
): RenderQueue {
  let buffer = ''
  let rafId: number | null = null
  let networkDone = false
  let idleResolver: (() => void) | null = null

  function tryResolveIdle(): void {
    if (idleResolver && networkDone && buffer.length === 0) {
      const resolve = idleResolver
      idleResolver = null
      resolve()
    }
  }

  function renderFrame(): void {
    rafId = null

    if (buffer.length === 0) {
      tryResolveIdle()
      return
    }

    const rawCut = Math.min(chunkSizeForBufferLen(buffer.length, networkDone), buffer.length)
    let cut = clampChunkCutToFenceLines(buffer, rawCut)
    if (cut <= 0) {
      if (networkDone && buffer.length > 0) {
        cut = buffer.length
      } else {
        schedule()
        return
      }
    }

    const chunk = buffer.slice(0, cut)
    buffer = buffer.slice(cut)
    onAppend(chunk)

    if (buffer.length > 0 || !networkDone) {
      schedule()
    } else {
      tryResolveIdle()
    }
  }

  function schedule(): void {
    if (rafId === null) {
      rafId = requestAnimationFrame(renderFrame)
    }
  }

  return {
    push(chunk) {
      if (!chunk) return
      buffer += chunk
      schedule()
    },

    complete() {
      networkDone = true
      schedule()
      tryResolveIdle()
    },

    waitForIdle() {
      return new Promise((resolve) => {
        if (networkDone && buffer.length === 0) {
          resolve()
        } else {
          idleResolver = resolve
          schedule()
        }
      })
    },

    dispose() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (buffer.length > 0) {
        onAppend(buffer)
        buffer = ''
      }
      networkDone = true
      if (idleResolver) {
        idleResolver()
        idleResolver = null
      }
    },
  }
}

/**
 * 执行异步网络等逻辑；成功则 complete + 等待排空，失败则 dispose（取消 RAF、刷出剩余 buffer）。
 */
export async function withRenderQueue(
  queue: RenderQueue,
  work: () => Promise<void>,
): Promise<void> {
  try {
    await work()
    queue.complete()
    await queue.waitForIdle()
  } catch (err) {
    queue.dispose()
    throw err
  }
}
