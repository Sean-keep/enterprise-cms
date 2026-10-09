'use client'

import { useRef } from 'react'

/**
 * 正文富文本编辑器。
 *
 * 接口是 `{ value: html, onChange: (html) => void }` —— 和 Tiptap 完全一致，
 * 以后换成 Tiptap 只动这一个文件，表单和服务端都不用改。
 *
 * 本轮先用「textarea + 常用标签工具条」：骨架阶段的验收是「能写能存能渲染」，
 * 不是排版体验。存的都是 sanitize 后的 HTML，这一层替换不影响数据。
 */
export function RichText({
  value,
  onChange,
  rows = 12,
  placeholder = '<p>在这里写正文…</p>',
}: {
  value: string
  onChange: (html: string) => void
  rows?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  /** 在光标处包一层标签 */
  function wrap(tag: string, attrs = '') {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || '文字'
    const open = `<${tag}${attrs ? ' ' + attrs : ''}>`
    const close = `</${tag}>`
    const next = value.slice(0, start) + open + selected + close + value.slice(end)
    onChange(next)
    // 光标放到闭合标签后
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + open.length + selected.length
      el.setSelectionRange(pos, pos)
    })
  }

  function insertBlock(html: string) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    onChange(value.slice(0, start) + html + value.slice(start))
  }

  return (
    <div>
      <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={() => wrap('h2')}>H2</button>
        <button type="button" className="btn btn-sm" onClick={() => wrap('h3')}>H3</button>
        <button type="button" className="btn btn-sm" onClick={() => wrap('strong')}>加粗</button>
        <button type="button" className="btn btn-sm" onClick={() => wrap('em')}>斜体</button>
        <button type="button" className="btn btn-sm" onClick={() => wrap('blockquote')}>引用</button>
        <button type="button" className="btn btn-sm" onClick={() => insertBlock('<ul><li>要点</li></ul>')}>列表</button>
        <button type="button" className="btn btn-sm" onClick={() => wrap('a', 'href="https://"')}>链接</button>
        <button type="button" className="btn btn-sm" onClick={() => insertBlock('<img src="/uploads/..." alt="" />')}>
          图片
        </button>
      </div>
      <textarea
        ref={ref}
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        style={{ fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.6 }}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="field-hint">
        存的是 HTML。输出前后各清洗一遍，允许 <code>p / h2-h4 / ul-ol / a / img / table / blockquote</code> 等标签。
      </div>
    </div>
  )
}
