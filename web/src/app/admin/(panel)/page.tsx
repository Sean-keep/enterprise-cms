'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import { CONTENT_STATUS_LABELS, PRODUCT_KIND_LABELS, type ProductKind } from '@cms/shared'

type Stats = {
  pages: number
  posts: number
  products: number
  forms: number
  unreadForms: number
  byKind: Record<string, number>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<{ id: string; name: string; message: string; createdAt: string }[]>([])

  useEffect(() => {
    void (async () => {
      const [pages, posts, products, forms, formStats] = await Promise.all([
        adminApi.get<{ total: number }>('/api/admin/pages?pageSize=1').catch(() => ({ total: 0 })),
        adminApi.get<{ total: number }>('/api/admin/posts?pageSize=1').catch(() => ({ total: 0 })),
        adminApi.get<{ total: number; items: { kind: string }[] }>('/api/admin/products?pageSize=100').catch(() => ({ total: 0, items: [] })),
        adminApi.get<{ items: { id: string; name: string; message: string; createdAt: string }[] }>(
          '/api/admin/forms?pageSize=5',
        ).catch(() => ({ items: [] })),
        adminApi.get<{ total: number; unread: number }>('/api/admin/forms/stats').catch(() => ({ total: 0, unread: 0 })),
      ])

      const byKind: Record<string, number> = {}
      for (const p of products.items ?? []) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1

      setStats({
        pages: pages.total,
        posts: posts.total,
        products: products.total,
        forms: formStats.total,
        unreadForms: formStats.unread,
        byKind,
      })
      setRecent(forms.items)
    })()
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>概览</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <Card label="页面" value={stats?.pages ?? '—'} href="/admin/pages" />
        <Card label="新闻" value={stats?.posts ?? '—'} href="/admin/news" />
        <Card label="产品/服务/案例" value={stats?.products ?? '—'} href="/admin/products" />
        <Card
          label="未读留言"
          value={stats?.unreadForms ?? '—'}
          href="/admin/contact"
          highlight={(stats?.unreadForms ?? 0) > 0}
        />
      </div>

      {stats ? (
        <div className="card mt-24">
          <h3 className="card-title">内容构成</h3>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {(Object.keys(PRODUCT_KIND_LABELS) as ProductKind[]).map((k) => (
              <span key={k} className="tag tag-brand">
                {PRODUCT_KIND_LABELS[k]} {stats.byKind[k] ?? 0}
              </span>
            ))}
            <span className="tag">留言总数 {stats.forms}</span>
          </div>
        </div>
      ) : null}

      <div className="card mt-16">
        <h3 className="card-title">最近留言</h3>
        {recent.length === 0 ? (
          <div className="empty">还没有留言。</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>内容</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="muted" style={{ maxWidth: 380 }}>
                    {r.message.slice(0, 80)}
                    {r.message.length > 80 ? '…' : ''}
                  </td>
                  <td className="muted">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card mt-16">
        <h3 className="card-title">常用入口</h3>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin/pages/new" className="btn btn-primary">新建页面</Link>
          <Link href="/admin/news/new" className="btn">写一篇新闻</Link>
          <Link href="/admin/products/new" className="btn">添加产品</Link>
          <Link href="/admin/settings" className="btn">站点设置</Link>
        </div>
        <p className="field-hint mt-16 mb-0">
          保存后前台会自动刷新（revalidate）。如果看到官网没更新，可以在站点设置里手动触发一次。
        </p>
      </div>
    </div>
  )
}

function Card({
  label,
  value,
  href,
  highlight,
}: {
  label: string
  value: number | string
  href: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className="card"
      style={{ display: 'block', borderColor: highlight ? 'var(--warn)' : undefined }}
    >
      <div className="muted" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          marginTop: 4,
          color: highlight ? 'var(--warn)' : 'var(--fg)',
          letterSpacing: '-.02em',
        }}
      >
        {value}
      </div>
    </Link>
  )
}
