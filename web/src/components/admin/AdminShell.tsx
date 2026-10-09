'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import type { UserDto } from '@cms/shared'

const NAV = [
  { href: '/admin', label: '概览', exact: true },
  { href: '/admin/pages', label: '页面' },
  { href: '/admin/news', label: '新闻' },
  { href: '/admin/products', label: '产品/服务/案例' },
  { href: '/admin/contact', label: '留言' },
  { href: '/admin/menus', label: '导航菜单' },
  { href: '/admin/settings', label: '站点设置' },
]

/**
 * 后台外壳。登录态在 httpOnly cookie 里，前端读不到 —— 所以用
 * /api/admin/auth/me 问一次，没登录就跳登录页。别在 localStorage 存 token。
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserDto | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminApi
      .get<UserDto>('/api/admin/auth/me')
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) router.replace('/admin/login')
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  async function logout() {
    await adminApi.post('/api/admin/auth/logout').catch(() => {})
    router.replace('/admin/login')
  }

  if (checking) {
    return (
      <div className="empty" style={{ padding: 80 }}>
        正在验证登录状态…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-soft)' }}>
      <aside
        style={{
          width: 212,
          flexShrink: 0,
          background: 'var(--fg)',
          color: '#c3c8d2',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 650 }}>内容管理</div>
          <div style={{ fontSize: 12, marginTop: 3 }}>企业官网 CMS</div>
        </div>

        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: 'block',
                  padding: '9px 12px',
                  borderRadius: 7,
                  fontSize: 14,
                  marginBottom: 2,
                  background: active ? 'rgba(255,255,255,.14)' : 'transparent',
                  color: active ? '#fff' : '#c3c8d2',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12.5 }}>
          <div style={{ color: '#fff', marginBottom: 2 }}>{user?.name}</div>
          <div style={{ opacity: 0.65, marginBottom: 10 }}>{user?.email}</div>
          <div className="row" style={{ gap: 8 }}>
            <a href="/" target="_blank" className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              查看官网
            </a>
            <button type="button" className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={logout}>
              退出
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 24 }}>{children}</main>
    </div>
  )
}
