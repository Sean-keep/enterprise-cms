import sanitizeHtml from 'sanitize-html'

/**
 * 入库清洗。富文本存的是 HTML，这是 XSS 的正面战场。
 *
 * 白名单要和 web/src/lib/sanitize.ts **保持一致** —— 两道防线用同一份名单，
 * 否则会出现「入库洗掉了、出库又放出来」或反过来的缺口。
 * 改这里就去改那边，别只改一边。
 */

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'strong', 'em', 'u', 's', 'code', 'pre',
  'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  code: ['class'],
}

/**
 * URL 白名单。显式写一遍，不光依赖 sanitize-html 的 allowedSchemes ——
 * 协议大小写混写、前导空白、协议相对地址都要挡在这一层。
 */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function safeUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null

  // 协议相对 //evil.com —— 继承当前页协议，等于外部请求
  if (value.startsWith('//')) return null

  // 站内相对路径 / 锚点 / 查询串，放行
  if (/^(?:\/(?!\/)|\.{1,2}\/|#|\?)/.test(value)) return value

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  return SAFE_SCHEMES.has(parsed.protocol.toLowerCase()) ? value : null
}

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return ''
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    transformTags: {
      a: (_tagName, attribs) => {
        const href = safeUrl(attribs.href)
        if (!href) {
          // 没有合法 href 的 <a> 降级成 <span>，别留个点不动的死链
          return { tagName: 'span', attribs: {} }
        }
        const next: Record<string, string> = { href }
        if (attribs.title) next.title = attribs.title
        if (attribs.target === '_blank') {
          next.target = '_blank'
          // target=_blank 不带 noopener 是 tabnabbing
          next.rel = 'noopener noreferrer'
        }
        return { tagName: 'a', attribs: next }
      },
      img: (_tagName, attribs) => {
        const src = safeUrl(attribs.src)
        if (!src) return { tagName: 'span', attribs: {} }
        const next: Record<string, string> = { src, loading: 'lazy' }
        if (attribs.alt) next.alt = attribs.alt
        if (attribs.title) next.title = attribs.title
        if (attribs.width) next.width = attribs.width
        if (attribs.height) next.height = attribs.height
        return { tagName: 'img', attribs: next }
      },
    },
  })
}

/**
 * 纯文本字段。去掉控制字符和尖括号 —— 这些字段不做富文本，
 * 但表单提交里什么都能塞进来，落库前先削平。
 *
 * 用 codePoint 过滤，不用正则字符类：写成 /[\u0000-\u001F\u007F]/ 时
 * 转义在编辑链路里容易被吃成字面控制字符，行为就不对了。
 */
export function sanitizePlain(input: string | null | undefined): string {
  if (input === null || input === undefined) return ''
  let out = ''
  for (const ch of String(input)) {
    const code = ch.codePointAt(0) ?? 0
    if (code <= 0x1f || code === 0x7f) continue
    if (ch === '<' || ch === '>') continue
    out += ch
  }
  return out.trim()
}
