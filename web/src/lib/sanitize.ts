import sanitizeHtml from 'sanitize-html'

/**
 * 出库再清洗一遍。后端入库时已经洗过，这里是第二道防线 ——
 * 万一库被绕过（备份还原、直接改库、未来接了别的写入方），
 * 页面输出这一关还能兜住。两道用同一份白名单。
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

export function renderRichText(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
  })
}

/** 纯文本字段显示用 —— 表单提交里可能被塞了尖括号 */
export function plainText(input: string | null | undefined): string {
  if (!input) return ''
  return input.replace(/[<>]/g, '')
}
