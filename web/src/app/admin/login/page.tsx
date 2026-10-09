'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, errMsg } from '@/lib/admin-api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminApi.post('/api/admin/auth/login', { email, password })
      router.replace('/admin')
    } catch (err) {
      setError(errMsg(err))
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-soft)',
        padding: 20,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 28,
        }}
      >
        <h1 style={{ fontSize: 21, marginBottom: 6 }}>内容管理后台</h1>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 22 }}>
          企业官网 CMS
        </p>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="field">
          <label>邮箱</label>
          <input
            className="input"
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>密码</label>
          <input
            className="input"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? '登录中…' : '登录'}
        </button>

        <p className="muted" style={{ fontSize: 12, marginTop: 18, marginBottom: 0 }}>
          初始账号见 README，登录后请立刻修改密码。
        </p>
      </form>
    </div>
  )
}
