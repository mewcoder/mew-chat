<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

/** 子文档 → 父页：高度同步 */
const IFRAME_HEIGHT_MSG = 'chatbox-iframe-height'
/** 父页 → 子文档：流式/增量更新正文（壳页不重建，避免整 iframe 重载） */
const IFRAME_HTML_MSG = 'chatbox-iframe-html'

const IFRAME_THEME_CSS = `
:root {
  --surface: #faf8f5;
  --surface-elevated: #ffffff;
  --accent: #ea580c;
  --accent-soft: rgba(234, 88, 12, 0.12);
  --ring-focus: rgba(234, 88, 12, 0.35);
  --shadow-ui-sm:
    0 1px 2px 0 rgb(28 25 23 / 0.04), 0 1px 1px -0.5px rgb(28 25 23 / 0.03);
  --shadow-ui-md:
    0 2px 8px -2px rgb(28 25 23 / 0.07), 0 1px 2px -1px rgb(28 25 23 / 0.04);
  --shadow-ui-lg:
    0 6px 24px -4px rgb(28 25 23 / 0.09), 0 2px 8px -2px rgb(28 25 23 / 0.05);
  --shadow-ui-dialog:
    0 16px 48px -12px rgb(0 0 0 / 0.12), 0 4px 16px -4px rgb(0 0 0 / 0.06);
  --shadow-ui-hairline: 0 1px 0 0 rgb(255 255 255 / 0.55);
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 0;
  height: auto;
  overflow: hidden;
  background: transparent;
  color: #1c1917;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--accent); }
a:hover { text-decoration: underline; }
::selection {
  background-color: var(--accent-soft);
  color: inherit;
}
#chatbox-iframe-root {
  overflow: hidden;
  min-height: 0;
}
`.trim()

const RESIZE_BRIDGE_JS = `
(function(){
  var TYPE = ${JSON.stringify(IFRAME_HEIGHT_MSG)};
  var raf = null;
  /** 只量 #chatbox-iframe-root，避免 html/body/root 三者 scrollHeight 不一致导致高度来回跳、滚动条闪烁 */
  function measure() {
    var root = document.getElementById('chatbox-iframe-root');
    if (!root) return 0;
    var h = root.scrollHeight;
    if (h <= 0) h = root.offsetHeight;
    return Math.ceil(h) + 2;
  }
  function send() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function() {
      raf = null;
      try {
        if (parent) parent.postMessage({ type: TYPE, height: measure() }, '*');
      } catch (e) {}
    });
  }
  window.addEventListener('load', send);
  document.addEventListener('DOMContentLoaded', send);
  if (typeof ResizeObserver !== 'undefined') {
    try {
      var ro = new ResizeObserver(send);
      var root = document.getElementById('chatbox-iframe-root');
      if (root) ro.observe(root);
    } catch (e) {}
  }
  setTimeout(send, 0);
  setTimeout(send, 80);
})();
`.trim()

/** 监听父页 postMessage，写入 #chatbox-iframe-root；innerHTML 不执行 script，故克隆替换以触发执行 */
const STREAM_BRIDGE_JS = `
(function(){
  var HTML_TYPE = ${JSON.stringify(IFRAME_HTML_MSG)};
  function activateScripts(root) {
    if (!root) return;
    root.querySelectorAll('script').forEach(function(old) {
      var s = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) {
        var a = old.attributes[i];
        s.setAttribute(a.name, a.value);
      }
      s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
  }
  window.addEventListener('message', function(e) {
    if (e.source !== parent) return;
    var d = e.data;
    if (!d || d.type !== HTML_TYPE) return;
    document.querySelectorAll('[data-chatbox-user-style]').forEach(function(n) { n.remove(); });
    if (d.headStyles) {
      var wrap = document.createElement('div');
      wrap.setAttribute('data-chatbox-user-style', '1');
      wrap.innerHTML = d.headStyles;
      var h = document.head;
      while (wrap.firstChild) h.appendChild(wrap.firstChild);
    }
    var root = document.getElementById('chatbox-iframe-root');
    if (!root) return;
    root.innerHTML = typeof d.html === 'string' ? d.html : '';
    activateScripts(root);
    setTimeout(function() {
      try {
        if (parent) {
          var el = document.getElementById('chatbox-iframe-root');
          var h = el ? Math.ceil(el.scrollHeight || el.offsetHeight) + 2 : 0;
          parent.postMessage({ type: ${JSON.stringify(IFRAME_HEIGHT_MSG)}, height: h }, '*');
        }
      } catch (e) {}
    }, 0);
  });
})();
`.trim()

function injectTheme(doc: Document): void {
  const head = doc.head
  if (!head) return
  const style = doc.createElement('style')
  style.setAttribute('data-chatbox-theme', '1')
  style.textContent = IFRAME_THEME_CSS
  head.insertBefore(style, head.firstChild)
}

function injectStreamBridge(doc: Document): void {
  const body = doc.body
  if (!body) return
  const s = doc.createElement('script')
  s.setAttribute('data-chatbox-stream', '1')
  s.textContent = STREAM_BRIDGE_JS
  body.appendChild(s)
}

function injectResizeBridge(doc: Document): void {
  const body = doc.body
  if (!body) return
  const s = doc.createElement('script')
  s.setAttribute('data-chatbox-resize', '1')
  s.textContent = RESIZE_BRIDGE_JS
  body.appendChild(s)
}

function serializeDocument(doc: Document): string {
  const dt = doc.doctype
  const prelude = dt ? `<!DOCTYPE ${dt.name}>\n` : '<!DOCTYPE html>\n'
  return prelude + doc.documentElement.outerHTML
}

function buildShellSrcdoc(): string {
  const doc = new DOMParser().parseFromString(
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="chatbox-iframe-root"></div></body></html>',
    'text/html',
  )
  injectTheme(doc)
  injectStreamBridge(doc)
  injectResizeBridge(doc)
  return serializeDocument(doc)
}

let shellSrcdocCache: string | null = null
function getShellSrcdoc(): string {
  if (shellSrcdocCache !== null) return shellSrcdocCache
  shellSrcdocCache = buildShellSrcdoc()
  return shellSrcdocCache
}

function looksLikeFullDocument(s: string): boolean {
  const t = s.trim()
  return /^<!DOCTYPE/i.test(t) || /^<html[\s>]/i.test(t)
}

/** 将模型输出切成可写入壳内 #root 的片段；完整文档时拆出 body 与 head 内 style */
function normalizeHtmlForShell(raw: string): { html: string; headStyles: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { html: '', headStyles: '' }
  if (!looksLikeFullDocument(trimmed)) {
    return { html: trimmed, headStyles: '' }
  }
  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  const parts: string[] = []
  doc.head.querySelectorAll('style').forEach((el) => {
    parts.push(el.outerHTML)
  })
  return {
    html: doc.body.innerHTML,
    headStyles: parts.join('\n'),
  }
}

const props = withDefaults(
  defineProps<{
    html: string
    title?: string
    minHeight?: string
    allowForms?: boolean
  }>(),
  {
    allowForms: true,
  },
)

/** 与 props 无关，整页壳只加载一次 */
const shellSrcdoc = getShellSrcdoc()

const sandbox = computed(() => {
  const parts = ['allow-scripts']
  if (props.allowForms) parts.push('allow-forms')
  return parts.join(' ')
})

const iframeLabel = computed(() => props.title?.trim() || '内嵌 HTML 页面')

const iframeEl = ref<HTMLIFrameElement | null>(null)
const iframeReady = ref(false)
const contentHeightPx = ref(0)

let pushRaf: number | null = null
let heightDebounce: ReturnType<typeof setTimeout> | null = null
let pendingHeightPx = 0

function pushHtmlToChild(): void {
  const win = iframeEl.value?.contentWindow
  if (!win || !iframeReady.value) return
  const { html, headStyles } = normalizeHtmlForShell(props.html)
  win.postMessage(
    {
      type: IFRAME_HTML_MSG,
      html,
      headStyles,
    },
    '*',
  )
}

function schedulePush(): void {
  if (!iframeReady.value) return
  if (pushRaf != null) cancelAnimationFrame(pushRaf)
  pushRaf = requestAnimationFrame(() => {
    pushRaf = null
    pushHtmlToChild()
  })
}

function onFrameMessage(ev: MessageEvent): void {
  const win = iframeEl.value?.contentWindow
  if (!win || ev.source !== win) return
  const d = ev.data
  if (!d || typeof d !== 'object' || d.type !== IFRAME_HEIGHT_MSG) return
  if (typeof d.height !== 'number' || !Number.isFinite(d.height) || d.height < 0) return
  pendingHeightPx = Math.ceil(d.height)
  if (heightDebounce !== null) clearTimeout(heightDebounce)
  heightDebounce = setTimeout(() => {
    heightDebounce = null
    contentHeightPx.value = pendingHeightPx
  }, 40)
}

function onIframeLoad(): void {
  iframeReady.value = true
  schedulePush()
}

onMounted(() => {
  window.addEventListener('message', onFrameMessage)
  requestAnimationFrame(() => {
    const el = iframeEl.value
    if (el?.contentDocument?.readyState === 'complete') {
      iframeReady.value = true
      schedulePush()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('message', onFrameMessage)
  if (pushRaf != null) cancelAnimationFrame(pushRaf)
  if (heightDebounce !== null) {
    clearTimeout(heightDebounce)
    heightDebounce = null
  }
})

watch(() => props.html, schedulePush)

const iframeStyle = computed(() => {
  const h = contentHeightPx.value
  const style: Record<string, string> = {
    width: '100%',
    display: 'block',
    border: '0',
    verticalAlign: 'top',
    background: 'transparent',
  }
  if (props.minHeight) style.minHeight = props.minHeight
  if (h > 0) {
    style.height = `${h}px`
  } else {
    style.height = '2.5rem'
  }
  return style
})
</script>

<template>
  <div class="embed-iframe-seamless max-w-none">
    <div
      v-if="title"
      class="mb-1.5 text-xs font-semibold text-stone-700"
    >
      {{ title }}
    </div>
    <iframe
      ref="iframeEl"
      class="embed-iframe-frame"
      :style="iframeStyle"
      :title="iframeLabel"
      :sandbox="sandbox"
      :srcdoc="shellSrcdoc"
      loading="lazy"
      referrerpolicy="no-referrer"
      @load="onIframeLoad"
    />
  </div>
</template>

<style scoped>
.embed-iframe-seamless {
  overflow: hidden;
}

.embed-iframe-frame {
  overflow: hidden;
}
</style>
