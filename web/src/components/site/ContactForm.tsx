'use client'

import { useState } from 'react'

/**
 * 联系表单。公开写的唯一入口 —— 后端做了 IP 限流和字段校验，
 * 这边只负责提交体验：错误要能指到具体字段，成功要给明确反馈。
 */
export function ContactFormClient({ successMessage }: { successMessage?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
  })

  function set<K extends keyof typeof values>(key: K, v: string) {
    setValues((s) => ({ ...s, [key]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...values, sourceUrl: window.location.pathname }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error?.message ?? '提交失败，请稍后重试')
      }
      setState('done')
    } catch (err) {
      setState('idle')
      setError(err instanceof Error ? err.message : '提交失败')
    }
  }

  if (state === 'done') {
    return (
      <div className="alert alert-ok" role="status">
        {successMessage || '提交成功，我们会尽快与您联系。'}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row row-2">
        <div className="field">
          <label htmlFor="cf-name">姓名 *</label>
          <input
            id="cf-name"
            className="input"
            required
            maxLength={100}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cf-email">邮箱</label>
          <input
            id="cf-email"
            className="input"
            type="email"
            maxLength={100}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
      </div>

      <div className="row row-2">
        <div className="field">
          <label htmlFor="cf-phone">电话</label>
          <input
            id="cf-phone"
            className="input"
            maxLength={50}
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cf-company">公司</label>
          <input
            id="cf-company"
            className="input"
            maxLength={100}
            value={values.company}
            onChange={(e) => set('company', e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="cf-subject">主题</label>
        <input
          id="cf-subject"
          className="input"
          maxLength={200}
          value={values.subject}
          onChange={(e) => set('subject', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="cf-message">留言内容 *</label>
        <textarea
          id="cf-message"
          className="textarea"
          required
          maxLength={5000}
          rows={5}
          value={values.message}
          onChange={(e) => set('message', e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
        {state === 'sending' ? '提交中…' : '提交'}
      </button>
    </form>
  )
}
