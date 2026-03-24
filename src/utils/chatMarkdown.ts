import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import type Token from 'markdown-it/lib/token.mjs'
import { embedFenceLangs, parseEmbedFence } from '../components/embeds/embedRegistry'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

export type ChatSegment =
  | { type: 'html'; html: string }
  | {
      type: 'embed'
      name: string
      props: Record<string, unknown>
      /** 流式输出中 props 由 partial-json 推断，尚未通过完整 Schema */
      partial?: boolean
    }
  /** 围栏内容尚无法解析（如仅空白） */
  | { type: 'embed-pending'; lang: string }

function fenceLang(token: Token): string {
  return (token.info || '').trim().split(/\s+/)[0] ?? ''
}

/**
 * 将助手消息拆成「普通 Markdown 片段」与「自定义围栏组件」，便于流式场景下分段渲染。
 */
export function parseChatMarkdown(src: string): ChatSegment[] {
  const tokens = md.parse(src, {})
  const segments: ChatSegment[] = []
  const buffer: Token[] = []

  function flushBuffer(): void {
    if (buffer.length === 0) return
    const html = md.renderer.render(buffer, md.options, {})
    if (html.trim()) {
      segments.push({ type: 'html', html })
    }
    buffer.length = 0
  }

  for (const t of tokens) {
    if (t.type === 'fence') {
      const lang = fenceLang(t)
      if (embedFenceLangs.has(lang)) {
        const parsed = parseEmbedFence(lang, t.content)
        flushBuffer()
        if (parsed) {
          segments.push({
            type: 'embed',
            name: parsed.name,
            props: parsed.props,
            partial: parsed.partial,
          })
        } else {
          segments.push({ type: 'embed-pending', lang })
        }
        continue
      }
    }
    buffer.push(t)
  }
  flushBuffer()
  return segments
}

const PURIFY = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class', 'target', 'rel', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false,
}

export function sanitizeChatHtml(html: string): string {
  return String(DOMPurify.sanitize(html, PURIFY))
}
